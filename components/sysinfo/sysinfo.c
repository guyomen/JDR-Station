#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/temperature_sensor.h"
#include "esp_app_desc.h"
#include "esp_chip_info.h"
#include "esp_flash.h"
#include "esp_heap_caps.h"
#include "esp_idf_version.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "sdkconfig.h"
#include "store.h"
#include "sysinfo.h"

static const char *TAG = "sysinfo";
static temperature_sensor_handle_t s_tsens;

void sysinfo_init(void)
{
    temperature_sensor_config_t cfg = TEMPERATURE_SENSOR_CONFIG_DEFAULT(-10, 80);
    if (temperature_sensor_install(&cfg, &s_tsens) != ESP_OK || temperature_sensor_enable(s_tsens) != ESP_OK) {
        ESP_LOGW(TAG, "Capteur de temperature indisponible");
        s_tsens = NULL;
    }
}

static const char *reset_reason(void)
{
    switch (esp_reset_reason()) {
    case ESP_RST_POWERON:   return "mise sous tension";
    case ESP_RST_EXT:       return "broche reset";
    case ESP_RST_SW:        return "redémarrage logiciel";
    case ESP_RST_PANIC:     return "plantage";
    case ESP_RST_INT_WDT:
    case ESP_RST_TASK_WDT:
    case ESP_RST_WDT:       return "chien de garde";
    case ESP_RST_DEEPSLEEP: return "réveil";
    case ESP_RST_BROWNOUT:  return "baisse de tension";
    default:                return "inconnue";
    }
}

cJSON *sysinfo_json(void)
{
    cJSON *o = cJSON_CreateObject();
    cJSON_AddNumberToObject(o, "up", (double)(esp_timer_get_time() / 1000000));

    float celsius;
    if (s_tsens && temperature_sensor_get_celsius(s_tsens, &celsius) == ESP_OK)
        cJSON_AddNumberToObject(o, "temp", (int)(celsius * 10) / 10.0);

    cJSON *heap = cJSON_AddObjectToObject(o, "heap");
    cJSON_AddNumberToObject(heap, "free", heap_caps_get_free_size(MALLOC_CAP_8BIT));
    cJSON_AddNumberToObject(heap, "min", heap_caps_get_minimum_free_size(MALLOC_CAP_8BIT));
    cJSON_AddNumberToObject(heap, "big", heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
    cJSON_AddNumberToObject(heap, "total", heap_caps_get_total_size(MALLOC_CAP_8BIT));

    size_t total, used;
    if (store_usage(&total, &used)) {
        cJSON *fs = cJSON_AddObjectToObject(o, "fs");
        cJSON_AddNumberToObject(fs, "total", total);
        cJSON_AddNumberToObject(fs, "used", used);
    }

    cJSON *wifi = cJSON_AddObjectToObject(o, "wifi");
    uint8_t ch;
    wifi_second_chan_t ch2;
    if (esp_wifi_get_channel(&ch, &ch2) == ESP_OK) cJSON_AddNumberToObject(wifi, "ch", ch);
    cJSON *rssi = cJSON_AddArrayToObject(wifi, "rssi");
    wifi_sta_list_t sta;
    if (esp_wifi_ap_get_sta_list(&sta) == ESP_OK)
        for (int i = 0; i < sta.num; i++) cJSON_AddItemToArray(rssi, cJSON_CreateNumber(sta.sta[i].rssi));

    esp_chip_info_t chip;
    esp_chip_info(&chip);
    char buf[32];
    snprintf(buf, sizeof(buf), "%s rev %d.%d", CONFIG_IDF_TARGET, chip.revision / 100, chip.revision % 100);
    cJSON_AddStringToObject(o, "chip", buf);
    cJSON_AddNumberToObject(o, "cpu", CONFIG_ESP_DEFAULT_CPU_FREQ_MHZ);
    uint32_t flash;
    if (esp_flash_get_size(NULL, &flash) == ESP_OK) cJSON_AddNumberToObject(o, "flash", flash);

    const esp_app_desc_t *app = esp_app_get_description();
    cJSON_AddStringToObject(o, "idf", esp_get_idf_version());
    cJSON_AddStringToObject(o, "app", app->version);
    snprintf(buf, sizeof(buf), "%s %s", app->date, app->time);
    cJSON_AddStringToObject(o, "built", buf);
    cJSON_AddStringToObject(o, "reset", reset_reason());
    cJSON_AddNumberToObject(o, "tasks", uxTaskGetNumberOfTasks());
    return o;
}
