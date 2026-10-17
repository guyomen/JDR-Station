#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_spiffs.h"
#include "store.h"

#define BASE_PATH     "/data"
#define FILE_MAIN     BASE_PATH "/party.json"
#define FILE_TMP      BASE_PATH "/party.tmp"
#define MAX_FILE      (128 * 1024)
#define SAVE_DELAY_MS 2000

static const char *TAG = "store";
static cJSON *s_root;
static SemaphoreHandle_t s_mutex;
static volatile bool s_dirty;

void store_lock(void)       { xSemaphoreTake(s_mutex, portMAX_DELAY); }
void store_unlock(void)     { xSemaphoreGive(s_mutex); }
cJSON *store_root(void)     { return s_root; }
void store_mark_dirty(void) { s_dirty = true; }

static cJSON *load_file(const char *path)
{
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (size <= 0 || size > MAX_FILE) {
        fclose(f);
        return NULL;
    }
    char *buf = malloc(size + 1);
    if (!buf) {
        fclose(f);
        return NULL;
    }
    size_t rd = fread(buf, 1, size, f);
    fclose(f);
    buf[rd] = '\0';
    cJSON *json = cJSON_Parse(buf);
    free(buf);
    return json;
}

static void ensure_item(const char *key, cJSON *(*create)(void), cJSON_bool (*is_ok)(const cJSON *))
{
    if (!is_ok(cJSON_GetObjectItemCaseSensitive(s_root, key))) {
        cJSON_DeleteItemFromObjectCaseSensitive(s_root, key);
        cJSON_AddItemToObject(s_root, key, create());
    }
}

static cJSON *create_one(void) { return cJSON_CreateNumber(1); }

static void ensure_shape(void)
{
    if (!cJSON_IsObject(s_root)) {
        cJSON_Delete(s_root);
        s_root = cJSON_CreateObject();
    }
    ensure_item("next", create_one, cJSON_IsNumber);
    ensure_item("chars", cJSON_CreateArray, cJSON_IsArray);
    ensure_item("tokens", cJSON_CreateObject, cJSON_IsObject);
    ensure_item("log", cJSON_CreateArray, cJSON_IsArray);
    ensure_item("combat", cJSON_CreateObject, cJSON_IsObject);     /* complet : MJ seulement */
    ensure_item("combat_pub", cJSON_CreateObject, cJSON_IsObject); /* version publique */
}

static bool write_file(const char *txt)
{
    FILE *f = fopen(FILE_TMP, "wb");
    if (!f) return false;
    size_t len = strlen(txt);
    bool ok = fwrite(txt, 1, len, f) == len;
    ok = (fclose(f) == 0) && ok;
    if (!ok) return false;
    remove(FILE_MAIN);
    return rename(FILE_TMP, FILE_MAIN) == 0;
}

static void save_task(void *arg)
{
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(SAVE_DELAY_MS));
        if (!s_dirty) continue;

        store_lock();
        s_dirty = false;
        char *txt = cJSON_PrintUnformatted(s_root);
        store_unlock();

        if (txt && write_file(txt)) {
            ESP_LOGD(TAG, "Partie sauvegardee (%u octets)", (unsigned)strlen(txt));
        } else {
            ESP_LOGE(TAG, "Echec de la sauvegarde, nouvel essai bientot");
            s_dirty = true;
        }
        free(txt);
    }
}

esp_err_t store_init(void)
{
    s_mutex = xSemaphoreCreateMutex();

    esp_vfs_spiffs_conf_t conf = {
        .base_path = BASE_PATH,
        .partition_label = "storage",
        .max_files = 4,
        .format_if_mount_failed = true,
    };
    esp_err_t err = esp_vfs_spiffs_register(&conf);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Montage SPIFFS impossible (%s)", esp_err_to_name(err));
        return err;
    }

    s_root = load_file(FILE_MAIN);
    if (!s_root) s_root = load_file(FILE_TMP); /* coupure pendant une sauvegarde */
    ensure_shape();
    ESP_LOGI(TAG, "%d personnage(s) charge(s)",
             cJSON_GetArraySize(cJSON_GetObjectItem(s_root, "chars")));

    xTaskCreate(save_task, "store_save", 4096, NULL, 3, NULL);
    return ESP_OK;
}
