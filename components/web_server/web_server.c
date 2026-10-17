#include <ctype.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <strings.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <unistd.h>
#include "esp_http_server.h"
#include "esp_log.h"
#include "webapp.h"
#include "web_server.h"

#define MAX_SOCKETS  16            /* <= CONFIG_LWIP_MAX_SOCKETS - 4 (3 internes + DNS) */
#define MAX_WS_IN    (80 * 1024)   /* un import complet tient dans une trame */
#define DOCS_MAX     (256 * 1024)  /* document de règles envoyé par le MJ, compressé */
#define DOCS_RESERVE (96 * 1024)   /* place gardée pour la partie et les miniatures */

static const char *TAG = "web";
static httpd_handle_t s_server;
static web_server_config_t s_cfg;
static char s_portal_url[48];
static char s_files_uri[24];
static char s_docs_uri[24];

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

static esp_err_t asset_send(httpd_req_t *req, const webapp_asset_t *a)
{
    httpd_resp_set_type(req, a->mime);
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)a->data, a->len);
}

static esp_err_t asset_handler(httpd_req_t *req)
{
    const webapp_asset_t *a = webapp_find(req->uri);
    return a ? asset_send(req, a) : redirect_to_portal(req);
}

/* Envoie le contenu d'un fichier ouvert (puis le ferme), par morceaux. */
static esp_err_t send_file(httpd_req_t *req, FILE *f)
{
    char *buf = malloc(2048);
    esp_err_t err = buf ? ESP_OK : ESP_ERR_NO_MEM;
    size_t n;
    while (err == ESP_OK && (n = fread(buf, 1, 2048, f)) > 0) err = httpd_resp_send_chunk(req, buf, n);
    fclose(f);
    free(buf);
    if (err == ESP_OK) err = httpd_resp_send_chunk(req, NULL, 0);
    return err;
}

static const char *mime_of(const char *path)
{
    const char *ext = strrchr(path, '.');
    if (ext && (strcasecmp(ext, ".jpg") == 0 || strcasecmp(ext, ".jpeg") == 0)) return "image/jpeg";
    if (ext && strcasecmp(ext, ".png") == 0) return "image/png";
    return "application/octet-stream";
}

/* Fichier du système de fichiers : nom limité à [A-Za-z0-9._-], sans "..", requête (?v=…) ignorée. */
static esp_err_t file_handler(httpd_req_t *req)
{
    const char *name = req->uri + strlen(s_files_uri);
    size_t len = strcspn(name, "?#");
    bool ok = len > 0 && len < 32 && !strstr(name, "..");
    for (size_t i = 0; ok && i < len; i++) ok = isalnum((unsigned char)name[i]) || strchr("._-", name[i]);
    char path[96];
    FILE *f = NULL;
    if (ok && snprintf(path, sizeof(path), "%s%s%.*s", s_cfg.files_root, s_files_uri, (int)len, name) < (int)sizeof(path))
        f = fopen(path, "rb");
    if (!f) {
        httpd_resp_set_status(req, "404 Not Found");
        return httpd_resp_send(req, NULL, 0);
    }

    httpd_resp_set_type(req, mime_of(path));
    httpd_resp_set_hdr(req, "Cache-Control", "public, max-age=31536000, immutable");
    return send_file(req, f);
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

/* ---------- Documents remplaçables (règles de la table) ---------- */

static esp_err_t docs_reply(httpd_req_t *req, const char *status, const char *msg)
{
    httpd_resp_set_status(req, status);
    httpd_resp_set_type(req, "text/plain; charset=utf-8");
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    return httpd_resp_send(req, msg, HTTPD_RESP_USE_STRLEN);
}

/* Document embarqué visé par l'URI (nom sans paramètres copié dans name), ou NULL. */
static const webapp_asset_t *doc_of(httpd_req_t *req, char *name, size_t size)
{
    const char *p = req->uri + strlen(s_docs_uri);
    size_t len = strcspn(p, "?#");
    if (len == 0 || len >= size || strstr(p, "..")) return NULL;
    for (size_t i = 0; i < len; i++) {
        if (!isalnum((unsigned char)p[i]) && !strchr("._-", p[i])) return NULL;
    }
    memcpy(name, p, len);
    name[len] = '\0';
    return webapp_find(req->uri);
}

static bool doc_path(char *out, size_t size, const char *name, const char *ext)
{
    return snprintf(out, size, "%s%s%s", s_cfg.docs_root, name, ext) < (int)size;
}

/* { "voies.md": 12345, … } : documents remplacés et taille de leur version compressée. */
static esp_err_t docs_index(httpd_req_t *req)
{
    char json[512] = "{";
    size_t len = 1, prefix = strlen(s_docs_uri);
    const webapp_asset_t *a;
    for (size_t i = 0; (a = webapp_at(i)) != NULL; i++) {
        char path[96];
        struct stat st;
        if (strncmp(a->path, s_docs_uri, prefix) != 0 || !doc_path(path, sizeof(path), a->path + prefix, ".gz")) continue;
        if (stat(path, &st) != 0) continue;
        int n = snprintf(json + len, sizeof(json) - len, "%s\"%s\":%ld", len > 1 ? "," : "", a->path + prefix, (long)st.st_size);
        if (n < 0 || n >= (int)(sizeof(json) - len - 1)) break;
        len += n;
    }
    strcpy(json + len, "}");
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    return httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);
}

static esp_err_t docs_get(httpd_req_t *req)
{
    char name[32], path[96];
    if (strncmp(req->uri + strlen(s_docs_uri), "index.json", 10) == 0) return docs_index(req);
    const webapp_asset_t *a = doc_of(req, name, sizeof(name));
    if (!a) return redirect_to_portal(req);
    FILE *f = NULL;
    if (!strstr(req->uri, "origine") && doc_path(path, sizeof(path), name, ".gz")) f = fopen(path, "rb");
    if (!f) return asset_send(req, a);
    httpd_resp_set_type(req, a->mime);
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return send_file(req, f);
}

/* Après un envoi ou une suppression : prévient tous les appareils. */
static void docs_notify(void)
{
    char *msg = s_cfg.docs_changed ? s_cfg.docs_changed() : NULL;
    if (msg) ws_broadcast(msg, -1);
    free(msg);
}

static bool docs_allowed(httpd_req_t *req)
{
    char pin[40];
    return s_cfg.docs_auth && httpd_req_get_hdr_value_str(req, "X-Pin", pin, sizeof(pin)) == ESP_OK && s_cfg.docs_auth(pin);
}

/* Corps : le document compressé en gzip, écrit dans un fichier temporaire puis renommé (tout ou rien). */
static esp_err_t docs_put(httpd_req_t *req)
{
    char name[32], path[96], tmp[96];
    if (!docs_allowed(req)) return docs_reply(req, "403 Forbidden", "Code MJ incorrect");
    if (!doc_of(req, name, sizeof(name)) || !doc_path(path, sizeof(path), name, ".gz") || !doc_path(tmp, sizeof(tmp), name, ".tmp"))
        return docs_reply(req, "404 Not Found", "Document inconnu");
    size_t total = req->content_len;
    if (total < 18 || total > DOCS_MAX) return docs_reply(req, "413 Payload Too Large", "Document trop gros (256 Ko compressé au plus)");
    struct stat st;
    size_t old = stat(path, &st) == 0 ? (size_t)st.st_size : 0;
    size_t space = s_cfg.docs_free ? s_cfg.docs_free() : 0;
    if (total + DOCS_RESERVE > space + old) return docs_reply(req, "507 Insufficient Storage", "Plus assez de place sur la station");

    FILE *f = fopen(tmp, "wb");
    char *buf = malloc(2048);
    bool ok = f && buf;
    size_t done = 0;
    int timeouts = 0;
    while (ok && done < total) {
        int n = httpd_req_recv(req, buf, total - done < 2048 ? total - done : 2048);
        if (n == HTTPD_SOCK_ERR_TIMEOUT && ++timeouts < 3) continue; /* appareil lent : on attend un peu */
        /* Un fichier gzip commence par 1f 8b. */
        ok = n > 0 && (done > 0 || (n >= 2 && (uint8_t)buf[0] == 0x1f && (uint8_t)buf[1] == 0x8b)) && fwrite(buf, 1, n, f) == (size_t)n;
        if (n > 0) done += n;
    }
    if (f && fclose(f) != 0) ok = false;
    free(buf);
    if (ok) {
        unlink(path);
        ok = rename(tmp, path) == 0;
    }
    if (!ok) {
        unlink(tmp);
        ESP_LOGW(TAG, "Echec de l'ecriture de %s", path);
        return docs_reply(req, "500 Internal Server Error", "Échec de l'écriture (fichier gzip attendu, ou flash pleine)");
    }
    ESP_LOGI(TAG, "Document de la table : %s (%u octets)", name, (unsigned)total);
    esp_err_t err = docs_reply(req, "200 OK", "ok");
    /* « X-Suite » : d'autres documents suivent, les appareils ne sont prévenus qu'après le dernier. */
    if (httpd_req_get_hdr_value_len(req, "X-Suite") == 0) docs_notify();
    return err;
}

static esp_err_t docs_delete(httpd_req_t *req)
{
    char name[32], path[96];
    if (!docs_allowed(req)) return docs_reply(req, "403 Forbidden", "Code MJ incorrect");
    if (!doc_of(req, name, sizeof(name)) || !doc_path(path, sizeof(path), name, ".gz"))
        return docs_reply(req, "404 Not Found", "Document inconnu");
    unlink(path);
    esp_err_t err = docs_reply(req, "200 OK", "ok");
    if (httpd_req_get_hdr_value_len(req, "X-Suite") == 0) docs_notify();
    return err;
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

    /* Ordre d'enregistrement = ordre de recherche : /ws et les fichiers avant le joker. */
    const httpd_uri_t ws = { .uri = "/ws", .method = HTTP_GET, .handler = ws_handler, .is_websocket = true };
    const httpd_uri_t assets = { .uri = "/*", .method = HTTP_GET, .handler = asset_handler };
    ESP_ERROR_CHECK(httpd_register_uri_handler(s_server, &ws));
    if (config->files_uri && config->files_root) {
        static char pattern[sizeof(s_files_uri) + 1];
        strlcpy(s_files_uri, config->files_uri, sizeof(s_files_uri));
        snprintf(pattern, sizeof(pattern), "%s*", s_files_uri);
        const httpd_uri_t files = { .uri = pattern, .method = HTTP_GET, .handler = file_handler };
        ESP_ERROR_CHECK(httpd_register_uri_handler(s_server, &files));
    }
    if (config->docs_uri && config->docs_root) {
        static char pattern[sizeof(s_docs_uri) + 1];
        strlcpy(s_docs_uri, config->docs_uri, sizeof(s_docs_uri));
        snprintf(pattern, sizeof(pattern), "%s*", s_docs_uri);
        const httpd_uri_t get = { .uri = pattern, .method = HTTP_GET, .handler = docs_get };
        const httpd_uri_t put = { .uri = pattern, .method = HTTP_PUT, .handler = docs_put };
        const httpd_uri_t del = { .uri = pattern, .method = HTTP_DELETE, .handler = docs_delete };
        ESP_ERROR_CHECK(httpd_register_uri_handler(s_server, &get));
        ESP_ERROR_CHECK(httpd_register_uri_handler(s_server, &put));
        ESP_ERROR_CHECK(httpd_register_uri_handler(s_server, &del));
    }
    ESP_ERROR_CHECK(httpd_register_uri_handler(s_server, &assets));
    httpd_register_err_handler(s_server, HTTPD_404_NOT_FOUND, error_handler);
    httpd_register_err_handler(s_server, HTTPD_405_METHOD_NOT_ALLOWED, error_handler);

    ESP_LOGI(TAG, "Serveur web demarre");
}
