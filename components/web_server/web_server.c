#include <stdbool.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include "esp_http_server.h"
#include "esp_log.h"
#include "webapp.h"
#include "web_server.h"

#define MAX_SOCKETS  16            /* <= CONFIG_LWIP_MAX_SOCKETS - 4 (3 internes + DNS) */
#define MAX_WS_IN    (80 * 1024)   /* un import complet tient dans une trame */

static const char *TAG = "web";
static httpd_handle_t s_server;
static web_server_config_t s_cfg;
static char s_portal_url[48];

/* Portail captif : toute URL inconnue (tests de connectivité Android/iOS/Windows…)
 * renvoie vers l'appli. */
static esp_err_t redirect_to_portal(httpd_req_t *req)
{
    httpd_resp_set_status(req, "302 Found");
    httpd_resp_set_hdr(req, "Location", s_portal_url);
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    return httpd_resp_send(req, "Redirection", HTTPD_RESP_USE_STRLEN);
}

static esp_err_t error_handler(httpd_req_t *req, httpd_err_code_t err)
{
    return redirect_to_portal(req);
}

static esp_err_t asset_handler(httpd_req_t *req)
{
    const webapp_asset_t *a = webapp_find(req->uri);
    if (!a) return redirect_to_portal(req);
    httpd_resp_set_type(req, a->mime);
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)a->data, a->len);
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
    web_ws_out_t out = { 0 };
    s_cfg.on_message(fd, (const char *)buf, frame.len, &out);
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
    char *msg = s_cfg.on_close ? s_cfg.on_close(fd) : NULL;
    close(fd);
    if (msg) ws_broadcast(msg, fd);
    free(msg);
}

void web_server_start(const web_server_config_t *config)
{
    s_cfg = *config;
    strlcpy(s_portal_url, config->portal_url, sizeof(s_portal_url));

    httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
    cfg.max_open_sockets = MAX_SOCKETS;
    cfg.lru_purge_enable = true; /* les téléphones en veille laissent des sockets mortes */
    cfg.stack_size = 8192;
    cfg.send_wait_timeout = 3;
    cfg.close_fn = on_close;
    cfg.uri_match_fn = httpd_uri_match_wildcard;

    /* Sondes captive portal (connecttest.txt, wpad.dat…) et clients WS disparus : bruit normal. */
    esp_log_level_set("httpd_uri", ESP_LOG_ERROR);
    esp_log_level_set("httpd_ws", ESP_LOG_ERROR);

    ESP_ERROR_CHECK(httpd_start(&s_server, &cfg));

    /* Ordre d'enregistrement = ordre de recherche : /ws avant le joker. */
    const httpd_uri_t ws = { .uri = "/ws", .method = HTTP_GET, .handler = ws_handler, .is_websocket = true };
    const httpd_uri_t assets = { .uri = "/*", .method = HTTP_GET, .handler = asset_handler };
    ESP_ERROR_CHECK(httpd_register_uri_handler(s_server, &ws));
    ESP_ERROR_CHECK(httpd_register_uri_handler(s_server, &assets));
    httpd_register_err_handler(s_server, HTTPD_404_NOT_FOUND, error_handler);
    httpd_register_err_handler(s_server, HTTPD_405_METHOD_NOT_ALLOWED, error_handler);

    ESP_LOGI(TAG, "Serveur web demarre");
}
