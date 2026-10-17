/* Lieux de l'écran partagé : l'écran charge ses images et annonce leur liste {id, n},
 * gardée par la station pour que le MJ choisisse parmi eux. Les images restent sur l'écran. */
#include <string.h>
#include "store.h"
#include "game_priv.h"

cJSON *lieux_list(void) { return cJSON_GetObjectItem(store_root(), "lieux"); }

void lieux_on_update(const cJSON *m, int fd, game_out_t *out)
{
    const cJSON *list = cJSON_GetObjectItem(m, "list");
    if (!cJSON_IsArray(list)) { out->reply = msg_err("Lieux invalides"); return; }

    cJSON *arr = cJSON_CreateArray();
    int count = 0;
    const cJSON *l;
    cJSON_ArrayForEach(l, list) {
        const char *id = json_str(l, "id");
        if (!id || !*id) continue;
        if (count++ >= MAX_LIEUX) break;
        const char *name = json_str(l, "n");
        cJSON *o = cJSON_CreateObject();
        json_add_str_trunc(o, "id", id, 32);
        json_add_str_trunc(o, "n", name && *name ? name : id, 95);
        cJSON_AddItemToArray(arr, o);
    }

    cJSON_ReplaceItemInObject(store_root(), "lieux", arr);
    store_mark_dirty();
    cJSON *o = msg_new("lieux");
    cJSON_AddItemReferenceToObject(o, "list", arr);
    out->broadcast = json_print_free(o);
}
