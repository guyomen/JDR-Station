#include "esp_log.h"
#include "sdkconfig.h"
#include "nvs_flash.h"
#include "store.h"
#include "wifi_ap.h"
#include "dns_server.h"
#include "web_server.h"

static const char *TAG = "jdr";

void app_main(void)
{
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(err);

    ESP_ERROR_CHECK(store_init());
    wifi_ap_start();
    dns_server_start();
    web_server_start();

    ESP_LOGI(TAG, "JDR Station prete : rejoignez le Wi-Fi \"%s\" puis ouvrez http://192.168.4.1",
             CONFIG_JDR_WIFI_SSID);
}
