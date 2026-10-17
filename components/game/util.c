#include <stdlib.h>
#include <string.h>
#include "esp_timer.h"
#include "game_priv.h"

#define MAX_PATH_SEGS 6
#define MAX_KEY_LEN   32

const char *json_str(const cJSON *o, const char *key)
{
    const cJSON *v = cJSON_GetObjectItemCaseSensitive(o, key);
    return cJSON_IsString(v) ? v->valuestring : NULL;
}

int json_int(const cJSON *o, const char *key, int def)
{
    const cJSON *v = cJSON_GetObjectItemCaseSensitive(o, key);
    return cJSON_IsNumber(v) ? v->valueint : def;
}

void json_add_str_trunc(cJSON *o, const char *key, const char *val, size_t max)
{
    char buf[96];
    if (!val) val = "";
    if (max >= sizeof(buf)) max = sizeof(buf) - 1;
    size_t n = strlen(val);
    if (n > max) {
        n = max;
        while (n > 0 && ((unsigned char)val[n] & 0xC0) == 0x80) n--;
    }
    memcpy(buf, val, n);
    buf[n] = '\0';
    cJSON_AddStringToObject(o, key, buf);
}

char *json_print_free(cJSON *o)
{
    char *s = cJSON_PrintUnformatted(o);
    cJSON_Delete(o);
    return s;
}

/*
 * Objets intermédiaires créés au besoin ; index de tableau = position existante
 * ou ajout en fin.
 */
bool json_set_path(cJSON *obj, const char *path, cJSON *val)
{
    char buf[MAX_PATH_SEGS * (MAX_KEY_LEN + 1)];
    if (strlen(path) >= sizeof(buf)) return false;
    strcpy(buf, path);

    char *save = NULL;
    char *seg = strtok_r(buf, ".", &save);
    cJSON *cur = obj;
    int depth = 0;
    while (seg) {
        char *next = strtok_r(NULL, ".", &save);
        if (++depth > MAX_PATH_SEGS || strlen(seg) > MAX_KEY_LEN) return false;

        if (cJSON_IsArray(cur)) {
            char *end;
            long i = strtol(seg, &end, 10);
            int size = cJSON_GetArraySize(cur);
            if (*end || i < 0 || i > size) return false;
            if (!next) {
                if (i < size) cJSON_ReplaceItemInArray(cur, i, val);
                else cJSON_AddItemToArray(cur, val);
                return true;
            }
            if (i == size) return false;
            cur = cJSON_GetArrayItem(cur, i);
        } else if (cJSON_IsObject(cur)) {
            if (!next) {
                if (cJSON_GetObjectItemCaseSensitive(cur, seg))
                    cJSON_ReplaceItemInObjectCaseSensitive(cur, seg, val);
                else
                    cJSON_AddItemToObject(cur, seg, val);
                return true;
            }
            cJSON *child = cJSON_GetObjectItemCaseSensitive(cur, seg);
            if (!child) child = cJSON_AddObjectToObject(cur, seg);
            cur = child;
        } else {
            return false;
        }
        seg = next;
    }
    return false;
}

double game_now_ms(void) { return (double)(esp_timer_get_time() / 1000); }
