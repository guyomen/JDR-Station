#include <string.h>
#include "esp_wifi.h"
#include "esp_mac.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "esp_log.h"
#include "sdkconfig.h"
#include "wifi_ap.h"

static const char *TAG = "wifi";

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

void wifi_ap_start(void)
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_ap();

    wifi_init_config_t init = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init));
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, on_wifi_event, NULL));

    wifi_config_t cfg = {
        .ap = {
            .channel = CONFIG_JDR_WIFI_CHANNEL,
            .max_connection = CONFIG_JDR_MAX_STA,
            .authmode = WIFI_AUTH_WPA2_PSK,
            .pmf_cfg = { .required = false },
        },
    };
    strlcpy((char *)cfg.ap.ssid, CONFIG_JDR_WIFI_SSID, sizeof(cfg.ap.ssid));
    cfg.ap.ssid_len = strlen((char *)cfg.ap.ssid);
    strlcpy((char *)cfg.ap.password, CONFIG_JDR_WIFI_PASSWORD, sizeof(cfg.ap.password));

    size_t pass_len = strlen(CONFIG_JDR_WIFI_PASSWORD);
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

    ESP_LOGI(TAG, "Point d'acces \"%s\" demarre (canal %d, %s)", CONFIG_JDR_WIFI_SSID,
             CONFIG_JDR_WIFI_CHANNEL, cfg.ap.authmode == WIFI_AUTH_OPEN ? "ouvert" : "WPA2");
}
