#include <string.h>
#include "esp_wifi.h"
#include "esp_mac.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "esp_log.h"
#include "wifi_ap.h"

static const char *TAG = "wifi";
static esp_netif_t *s_netif;

static void on_wifi_event(void *arg, esp_event_base_t base, int32_t id, void *data)
{
    if (id == WIFI_EVENT_AP_STACONNECTED) {
        wifi_event_ap_staconnected_t *e = data;
        ESP_LOGI(TAG, "Appareil connecte " MACSTR, MAC2STR(e->mac));
    } else if (id == WIFI_EVENT_AP_STADISCONNECTED) {
        wifi_event_ap_stadisconnected_t *e = data;
        ESP_LOGI(TAG, "Appareil deconnecte " MACSTR, MAC2STR(e->mac));
    }
}

void wifi_ap_start(const wifi_ap_settings_t *settings)
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    s_netif = esp_netif_create_default_wifi_ap();

    wifi_init_config_t init = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init));
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, on_wifi_event, NULL));

    wifi_config_t cfg = {
        .ap = {
            .channel = settings->channel,
            .max_connection = settings->max_connections,
            .authmode = WIFI_AUTH_WPA2_PSK,
            .pmf_cfg = { .required = false },
        },
    };
    strlcpy((char *)cfg.ap.ssid, settings->ssid, sizeof(cfg.ap.ssid));
    cfg.ap.ssid_len = strlen((char *)cfg.ap.ssid);
    strlcpy((char *)cfg.ap.password, settings->password, sizeof(cfg.ap.password));

    size_t pass_len = strlen(settings->password);
    if (pass_len == 0) {
        cfg.ap.authmode = WIFI_AUTH_OPEN;
    } else if (pass_len < 8) {
        ESP_LOGW(TAG, "Mot de passe trop court (8 caracteres min.) : reseau ouvert");
        cfg.ap.authmode = WIFI_AUTH_OPEN;
        cfg.ap.password[0] = '\0';
    }

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &cfg));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "Point d'acces \"%s\" demarre (canal %d, %s)", (char *)cfg.ap.ssid,
             settings->channel, cfg.ap.authmode == WIFI_AUTH_OPEN ? "ouvert" : "WPA2");
}

esp_ip4_addr_t wifi_ap_ip(void)
{
    esp_netif_ip_info_t info;
    ESP_ERROR_CHECK(esp_netif_get_ip_info(s_netif, &info));
    return info.ip;
}
