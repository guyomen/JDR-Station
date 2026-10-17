/* Miniatures des personnages : JPEG carré préparé par l'appli (192 px, quelques Ko), gardé dans
 * un fichier à part (/data/av/<id>.jpg) et servi en HTTP sur /av/<id>.jpg.
 * "avatars" : {id: version} ; la version change à chaque envoi pour contourner le cache des navigateurs. */
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "mbedtls/base64.h"
#include "store.h"
#include "game_priv.h"

cJSON *avatar_list(void) { return cJSON_GetObjectItem(store_root(), "avatars"); }

/* L'id sert de nom de fichier : lettres et chiffres seulement. */
static bool file_of(const char *id, char *out, size_t len)
{
    if (!id || !*id) return false;
    for (const char *p = id; *p; p++) if (!isalnum((unsigned char)*p)) return false;
    return snprintf(out, len, "av/%s.jpg", id) < (int)len;
}

void avatar_remove(const char *id)
{
    char name[32];
    if (file_of(id, name, sizeof(name))) store_file_remove(name);
    cJSON_DeleteItemFromObjectCaseSensitive(avatar_list(), id); /* en dernier : id peut être la clé de l'entrée */
}

void avatar_clear_all(void)
{
    cJSON *a = avatar_list();
    while (a->child) avatar_remove(a->child->string);
}

static char *msg_avatar(const char *id, int version)
{
    cJSON *o = msg_new("avatar");
    cJSON_AddStringToObject(o, "id", id);
    cJSON_AddNumberToObject(o, "v", version);
    return json_print_free(o);
}

/* data : JPEG en base64, ou chaîne vide pour retirer la miniature. */
void avatar_on_update(const cJSON *m, int fd, game_out_t *out)
{
    const char *id = json_str(m, "id");
    const char *data = json_str(m, "data");
    char name[32];
    if (!party_find_char(id, NULL) || !data || !file_of(id, name, sizeof(name))) { out->reply = msg_err("Image invalide"); return; }
    if (!party_is_mj(m) && !party_is_owner(m, id)) { out->reply = msg_err("Modification non autorisee"); return; }

    if (!*data) {
        avatar_remove(id);
        store_mark_dirty();
        out->broadcast = msg_avatar(id, 0);
        return;
    }

    size_t b64 = strlen(data);
    if (b64 > (MAX_AVATAR + 2) / 3 * 4) { out->reply = msg_err("Image trop lourde"); return; }
    unsigned char *jpg = malloc(MAX_AVATAR);
    size_t len = 0;
    if (!jpg) { out->reply = msg_err("Memoire insuffisante"); return; }
    bool ok = mbedtls_base64_decode(jpg, MAX_AVATAR, &len, (const unsigned char *)data, b64) == 0
              && len > 3 && jpg[0] == 0xFF && jpg[1] == 0xD8 && jpg[2] == 0xFF;
    if (!ok) {
        free(jpg);
        out->reply = msg_err("Image invalide");
        return;
    }
    ok = store_file_write(name, jpg, len);
    free(jpg);
    if (!ok) { out->reply = msg_err("Enregistrement de l'image impossible"); return; }

    cJSON *next = cJSON_GetObjectItem(store_root(), "avnext");
    int version = next->valueint;
    cJSON_SetNumberValue(next, version + 1);
    cJSON_DeleteItemFromObjectCaseSensitive(avatar_list(), id);
    cJSON_AddNumberToObject(avatar_list(), id, version);
    store_mark_dirty();
    out->broadcast = msg_avatar(id, version);
}
