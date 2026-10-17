/* Initiative et PNJ : le MJ envoie la version complète (gardée pour lui) et la version
 * publique (PNJ visibles, santé en couleur) diffusée à tous. */
#include <stdlib.h>
#include <string.h>
#include "store.h"
#include "game_priv.h"

void combat_on_update(const cJSON *m, int fd, game_out_t *out)
{
    if (!party_is_mj(m)) { out->reply = msg_err("Reserve au MJ"); return; }
    const cJSON *full = cJSON_GetObjectItem(m, "full");
    const cJSON *pub = cJSON_GetObjectItem(m, "pub");
    if (!cJSON_IsObject(full) || !cJSON_IsObject(pub)) { out->reply = msg_err("Combat invalide"); return; }
    char *a = cJSON_PrintUnformatted(full), *b = cJSON_PrintUnformatted(pub);
    bool ok = a && b && strlen(a) <= MAX_COMBAT_JSON && strlen(b) <= MAX_COMBAT_JSON;
    free(a);
    free(b);
    if (!ok) { out->reply = msg_err("Trop de PNJ"); return; }

    cJSON_ReplaceItemInObject(store_root(), "combat", cJSON_Duplicate(full, true));
    cJSON *p = cJSON_Duplicate(pub, true);
    cJSON_ReplaceItemInObject(store_root(), "combat_pub", p);
    store_mark_dirty();
    cJSON *o = msg_new("combat");
    cJSON_AddItemReferenceToObject(o, "combat", p);
    out->broadcast = json_print_free(o);
}
