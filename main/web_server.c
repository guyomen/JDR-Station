#include <stdbool.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include "esp_http_server.h"
#include "esp_log.h"
#include "sdkconfig.h"
#include "game.h"
#include "web_server.h"

#define MAX_SOCKETS  16            /* <= CONFIG_LWIP_MAX_SOCKETS - 4 (3 internes + DNS) */
#define MAX_WS_IN    (80 * 1024)   /* un import complet tient dans une trame */

static const char *TAG = "web";
static httpd_handle_t s_server;

extern const uint8_t index_html_start[] asm("_binary_index_html_start");
extern const uint8_t index_html_end[]   asm("_binary_index_html_end");
extern const uint8_t app_js_start[]     asm("_binary_app_js_start");
extern const uint8_t app_js_end[]       asm("_binary_app_js_end");
extern const uint8_t cof2_js_start[]    asm("_binary_cof2_js_start");
extern const uint8_t cof2_js_end[]      asm("_binary_cof2_js_end");
extern const uint8_t drs_gz_start[]     asm("_binary_cof2_drs_js_gz_start");
extern const uint8_t drs_gz_end[]       asm("_binary_cof2_drs_js_gz_end");
extern const uint8_t style_css_start[]  asm("_binary_style_css_start");
extern const uint8_t style_css_end[]    asm("_binary_style_css_end");

typedef struct {
    const uint8_t *start, *end;
    const char *type;
    bool gzip;
} asset_t;

static const asset_t s_index = { index_html_start, index_html_end, "text/html; charset=utf-8", false };
static const asset_t s_app   = { app_js_start, app_js_end, "application/javascript; charset=utf-8", false };
static const asset_t s_cof2  = { cof2_js_start, cof2_js_end, "application/javascript; charset=utf-8", false };
static const asset_t s_drs   = { drs_gz_start, drs_gz_end, "application/javascript; charset=utf-8", true };
static const asset_t s_style = { style_css_start, style_css_end, "text/css; charset=utf-8", false };

static esp_err_t asset_handler(httpd_req_t *req)
{
    const asset_t *a = req->user_ctx;
    httpd_resp_set_type(req, a->type);
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    if (a->gzip) httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)a->start, a->end - a->start);
}

/* Portail captif : toute URL inconnue (tests de connectivité Android/iOS/Windows…)
 * renvoie vers l'appli. */
static esp_err_t redirect_handler(httpd_req_t *req, httpd_err_code_t err)
{
    httpd_resp_set_status(req, "302 Found");
    httpd_resp_set_hdr(req, "Location", "http://192.168.4.1/");
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    return httpd_resp_send(req, "Redirection", HTTPD_RESP_USE_STRLEN);
}

static void ws_send(int fd, const char *txt)
{
    httpd_ws_frame_t frame = {
        .final = true,
        .type = HTTPD_WS_TYPE_TEXT,
        .payload = (uint8_t *)txt,
        .len = strlen(txt),
    };
    httpd_ws_send_frame_async(s_server, fd, &frame);
}

/* Appelé depuis la tâche du serveur HTTP : envoi direct à chaque client WebSocket
 * (sauf skip, -1 pour aucun). */
static void ws_broadcast(const char *txt, int skip)
{
    int fds[MAX_SOCKETS];
    size_t count = MAX_SOCKETS;
    if (httpd_get_client_list(s_server, &count, fds) != ESP_OK) return;
    for (size_t i = 0; i < count; i++) {
        if (fds[i] != skip && httpd_ws_get_fd_info(s_server, fds[i]) == HTTPD_WS_CLIENT_WEBSOCKET) ws_send(fds[i], txt);
    }
}

static esp_err_t ws_handler(httpd_req_t *req)
{
    if (req->method == HTTP_GET) return ESP_OK; /* poignée de main terminée */

    httpd_ws_frame_t frame = { 0 };
    esp_err_t err = httpd_ws_recv_frame(req, &frame, 0);
    if (err != ESP_OK) return err;
    if (frame.type != HTTPD_WS_TYPE_TEXT || frame.len == 0) return ESP_OK;
    if (frame.len > MAX_WS_IN) {
        ESP_LOGW(TAG, "Message trop gros (%u octets)", (unsigned)frame.len);
        return ESP_FAIL;
    }

    uint8_t *buf = malloc(frame.len + 1);
    if (!buf) return ESP_ERR_NO_MEM;
    frame.payload = buf;
    err = httpd_ws_recv_frame(req, &frame, frame.len);
    if (err != ESP_OK) {
        free(buf);
        return err;
    }
    buf[frame.len] = '\0';

    int fd = httpd_req_to_sockfd(req);
    game_out_t out;
    game_handle((const char *)buf, frame.len, fd, &out);
    free(buf);

    /* Diffusion d'abord : un client qui reçoit "created" connaît déjà la fiche. */
    if (out.broadcast) ws_broadcast(out.broadcast, -1);
    if (out.reply) ws_send(fd, out.reply);
    free(out.reply);
    free(out.broadcast);
    return ESP_OK;
}

/* Fermeture d'une socket (déconnexion, purge LRU…) : on prévient les autres appareils. */
static void on_close(httpd_handle_t hd, int fd)
{
    char *msg = game_disconnect(fd);
    close(fd);
    if (msg) ws_broadcast(msg, fd);
    free(msg);
}

void web_server_start(void)
{
    httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
    cfg.max_open_sockets = MAX_SOCKETS;
    cfg.lru_purge_enable = true; /* les téléphones en veille laissent des sockets mortes */
    cfg.stack_size = 8192;
    cfg.send_wait_timeout = 3;
    cfg.close_fn = on_close;

    /* Sondes captive portal (connecttest.txt, wpad.dat…) et clients WS disparus : bruit normal. */
    esp_log_level_set("httpd_uri", ESP_LOG_ERROR);
    esp_log_level_set("httpd_ws", ESP_LOG_ERROR);

    ESP_ERROR_CHECK(httpd_start(&s_server, &cfg));

    const httpd_uri_t uris[] = {
        { .uri = "/",           .method = HTTP_GET, .handler = asset_handler, .user_ctx = (void *)&s_index },
        { .uri = "/index.html", .method = HTTP_GET, .handler = asset_handler, .user_ctx = (void *)&s_index },
        { .uri = "/app.js",     .method = HTTP_GET, .handler = asset_handler, .user_ctx = (void *)&s_app },
        { .uri = "/cof2_drs.js", .method = HTTP_GET, .handler = asset_handler, .user_ctx = (void *)&s_drs },
        { .uri = "/cof2.js",    .method = HTTP_GET, .handler = asset_handler, .user_ctx = (void *)&s_cof2 },
        { .uri = "/style.css", .method = HTTP_GET, .handler = asset_handler, .user_ctx = (void *)&s_style },
        { .uri = "/ws",         .method = HTTP_GET, .handler = ws_handler, .is_websocket = true },
    };
    for (size_t i = 0; i < sizeof(uris) / sizeof(uris[0]); i++) {
        httpd_register_uri_handler(s_server, &uris[i]);
    }
    httpd_register_err_handler(s_server, HTTPD_404_NOT_FOUND, redirect_handler);

    ESP_LOGI(TAG, "Serveur web demarre");
}
