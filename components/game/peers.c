/* Appareils connectés (en mémoire seulement) : [{id: fd, mj, dev, player, chars: [ids], since, screen?}]. */
#include <string.h>
#include <strings.h>
#include "game_priv.h"

static cJSON *s_peers;

cJSON *peers_list(void)
{
    if (!s_peers) s_peers = cJSON_CreateArray();
    return s_peers;
}

static cJSON *find_peer(int fd, int *index)
{
    int i = 0;
    cJSON *p;
    cJSON_ArrayForEach(p, peers_list()) {
        if (json_int(p, "id", -1) == fd) {
            if (index) *index = i;
            return p;
        }
        i++;
    }
    return NULL;
}

/* Un appareil se présente : ses personnages (vérifiés par leur code de reprise) et son rôle. */
void peers_on_presence(const cJSON *m, int fd, game_out_t *out)
{
    int index;
    cJSON *old = find_peer(fd, &index);
    double since = old ? cJSON_GetNumberValue(cJSON_GetObjectItem(old, "since")) : game_now_ms();

    cJSON *p = cJSON_CreateObject();
    cJSON_AddNumberToObject(p, "id", fd);
    cJSON_AddBoolToObject(p, "mj", party_is_mj(m));
    json_add_str_trunc(p, "dev", json_str(m, "dev"), 16);
    json_add_str_trunc(p, "player", json_str(m, "player"), 30);
    cJSON_AddNumberToObject(p, "since", since);
    cJSON *ids = cJSON_AddArrayToObject(p, "chars");
    const cJSON *mine = cJSON_GetObjectItem(m, "mine");
    const cJSON *kv;
    cJSON_ArrayForEach(kv, mine) {
        const char *ref = party_find_char(kv->string, NULL) ? json_str(party_tokens(), kv->string) : NULL;
        if (ref && cJSON_IsString(kv) && strcasecmp(kv->valuestring, ref) == 0)
            cJSON_AddItemToArray(ids, cJSON_CreateString(kv->string));
    }

    if (cJSON_IsTrue(cJSON_GetObjectItem(m, "screen"))) cJSON_AddTrueToObject(p, "screen");

    if (old) cJSON_ReplaceItemInArray(peers_list(), index, p);
    else cJSON_AddItemToArray(peers_list(), p);

    cJSON *r = msg_new("you");
    cJSON_AddNumberToObject(r, "id", fd);
    out->reply = json_print_free(r);
    out->broadcast = msg_peers();
}

char *peers_remove(int fd)
{
    int index;
    if (!find_peer(fd, &index)) return NULL;
    cJSON_DeleteItemFromArray(peers_list(), index);
    return msg_peers();
}
