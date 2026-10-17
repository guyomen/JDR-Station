/*
 * JDR Station : point d'entrée. Lit la configuration (menu « JDR Station » de menuconfig)
 * et relie entre eux les composants, qui ne se connaissent pas :
 *   network (Wi-Fi + DNS captif), store (sauvegarde), game (règles du protocole),
 *   web_server (HTTP + WebSocket) qui sert webapp (l'appli web embarquée).
 */
#include <stdio.h>
#include "esp_log.h"
#include "esp_netif.h"
#include "nvs_flash.h"
#include "sdkconfig.h"
#include "dns_server.h"
#include "game.h"
#include "store.h"
#include "web_server.h"
#include "wifi_ap.h"

static const char *TAG = "jdr";

static void nvs_init(void)
{
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(err);
}

/* Messages WebSocket → logique de la partie. */
static void on_ws_message(int fd, const char *msg, size_t len, web_ws_out_t *out)
{
    game_out_t res;
    game_handle(msg, len, fd, &res);
    out->reply = res.reply;
    out->broadcast = res.broadcast;
}

void app_main(void)
{
    nvs_init();
    ESP_ERROR_CHECK(store_init());
    game_init(CONFIG_JDR_MJ_PIN);

    const wifi_ap_settings_t wifi = {
        .ssid = CONFIG_JDR_WIFI_SSID,
        .password = CONFIG_JDR_WIFI_PASSWORD,
        .channel = CONFIG_JDR_WIFI_CHANNEL,
        .max_connections = CONFIG_JDR_MAX_STA,
    };
    wifi_ap_start(&wifi);

    esp_ip4_addr_t ip = wifi_ap_ip();
    dns_server_start(ip);

    char portal_url[32];
    snprintf(portal_url, sizeof(portal_url), "http://" IPSTR "/", IP2STR(&ip));
    const web_server_config_t web = {
        .portal_url = portal_url,
        .on_message = on_ws_message,
        .on_close = game_disconnect,
    };
    web_server_start(&web);

    ESP_LOGI(TAG, "JDR Station prete : rejoignez le Wi-Fi \"%s\" puis ouvrez %s", CONFIG_JDR_WIFI_SSID, portal_url);
}
