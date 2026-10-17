/* Fiches de personnage : création, modification champ par champ, suppression, reprise, import. */
#include <stdlib.h>
#include <string.h>
#include "store.h"
#include "game_priv.h"

void chars_on_create(const cJSON *m, int fd, game_out_t *out)
{
    const cJSON *src = cJSON_GetObjectItem(m, "char");
    if (!cJSON_IsObject(src)) { out->reply = msg_err("Fiche invalide"); return; }
    if (cJSON_GetArraySize(party_chars()) >= MAX_CHARS) {
        out->reply = msg_err("Nombre maximum de personnages atteint");
        return;
    }

    cJSON *c = cJSON_Duplicate(src, true);
    char id[12], tok[7];
    party_new_id(id, sizeof(id));
    cJSON_DeleteItemFromObjectCaseSensitive(c, "id");
    cJSON_AddStringToObject(c, "id", id);
    if (!party_char_fits(c)) {
        cJSON_Delete(c);
        out->reply = msg_err("Fiche trop volumineuse");
        return;
    }
    cJSON_AddItemToArray(party_chars(), c);
    party_new_token(tok);
    cJSON_AddStringToObject(party_tokens(), id, tok);
    store_mark_dirty();

    cJSON *r = msg_new("created");
    cJSON_AddStringToObject(r, "id", id);
    cJSON_AddStringToObject(r, "token", tok);
    out->reply = json_print_free(r);
    out->broadcast = msg_char(c);
}

void chars_on_patch(const cJSON *m, int fd, game_out_t *out)
{
    const char *id = json_str(m, "id");
    int index;
    cJSON *c = party_find_char(id, &index);
    if (!c) { out->reply = msg_err("Personnage introuvable"); return; }
    if (!party_is_mj(m) && !party_is_owner(m, id)) { out->reply = msg_err("Modification non autorisee"); return; }
    const cJSON *set = cJSON_GetObjectItem(m, "set");
    if (!cJSON_IsObject(set)) return;

    /* On travaille sur une copie : tout ou rien. */
    cJSON *copy = cJSON_Duplicate(c, true);
    const cJSON *kv;
    cJSON_ArrayForEach(kv, set) {
        const char *path = kv->string;
        if (!path || strcmp(path, "id") == 0 || strncmp(path, "id.", 3) == 0) goto fail;
        cJSON *val = cJSON_Duplicate(kv, true);
        if (!(val->type & cJSON_StringIsConst)) cJSON_free(val->string);
        val->string = NULL;
        if (!json_set_path(copy, path, val)) {
            cJSON_Delete(val);
            goto fail;
        }
    }
    if (!party_char_fits(copy)) {
        cJSON_Delete(copy);
        out->reply = msg_err("Fiche trop volumineuse");
        return;
    }
    cJSON_ReplaceItemInArray(party_chars(), index, copy);
    store_mark_dirty();
    out->broadcast = msg_char(copy);
    return;

fail:
    cJSON_Delete(copy);
    out->reply = msg_err("Modification invalide");
}

void chars_on_delete(const cJSON *m, int fd, game_out_t *out)
{
    const char *id = json_str(m, "id");
    int index;
    if (!party_find_char(id, &index)) return;
    if (!party_is_mj(m) && !party_is_owner(m, id)) { out->reply = msg_err("Suppression non autorisee"); return; }

    cJSON *o = msg_new("del");
    cJSON_AddStringToObject(o, "id", id); /* copie avant suppression de la fiche */
    cJSON_DeleteItemFromObjectCaseSensitive(party_tokens(), id);
    avatar_remove(id);
    cJSON_DeleteItemFromArray(party_chars(), index);
    store_mark_dirty();
    out->broadcast = json_print_free(o);
}

/* Reprise d'un personnage sur un autre appareil grâce à son code. */
void chars_on_claim(const cJSON *m, int fd, game_out_t *out)
{
    const char *id = json_str(m, "id");
    bool ok = party_find_char(id, NULL) && party_is_owner(m, id);
    cJSON *o = msg_new("claim");
    cJSON_AddBoolToObject(o, "ok", ok);
    if (ok) {
        cJSON_AddStringToObject(o, "id", id);
        cJSON_AddStringToObject(o, "token", json_str(party_tokens(), id));
    }
    out->reply = json_print_free(o);
}

void chars_on_import(const cJSON *m, int fd, game_out_t *out)
{
    if (!party_is_mj(m)) { out->reply = msg_err("Reserve au MJ"); return; }
    const cJSON *src = cJSON_GetObjectItem(m, "chars");
    if (!cJSON_IsArray(src)) { out->reply = msg_err("Fichier invalide"); return; }
    const cJSON *src_tokens = cJSON_GetObjectItem(m, "tokens");

    /* On repart de zéro : les ids importés sont conservés quand c'est possible.
     * Les miniatures ne font pas partie de l'export : un id réutilisé ne doit pas hériter d'une ancienne image. */
    avatar_clear_all();
    cJSON *old_tokens = cJSON_DetachItemFromObject(store_root(), "tokens");
    cJSON_ReplaceItemInObject(store_root(), "chars", cJSON_CreateArray());
    cJSON_AddItemToObject(store_root(), "tokens", cJSON_CreateObject());

    const cJSON *item;
    cJSON_ArrayForEach(item, src) {
        if (!cJSON_IsObject(item) || cJSON_GetArraySize(party_chars()) >= MAX_CHARS) continue;
        cJSON *c = cJSON_Duplicate(item, true);
        const char *id = json_str(c, "id");
        char idbuf[12];
        if (!id || strlen(id) >= sizeof(idbuf) || party_find_char(id, NULL)) {
            party_new_id(idbuf, sizeof(idbuf));
            cJSON_DeleteItemFromObjectCaseSensitive(c, "id");
            cJSON_AddStringToObject(c, "id", idbuf);
        } else {
            strcpy(idbuf, id);
        }
        if (!party_char_fits(c)) {
            cJSON_Delete(c);
            continue;
        }
        cJSON_AddItemToArray(party_chars(), c);

        const char *tok = json_str(src_tokens, idbuf);
        if (!tok) tok = json_str(old_tokens, idbuf);
        char fresh[7];
        if (!tok || strlen(tok) != 6) {
            party_new_token(fresh);
            tok = fresh;
        }
        cJSON_AddStringToObject(party_tokens(), idbuf, tok);
    }
    cJSON_Delete(old_tokens);

    /* Le compteur d'ids doit dépasser tous les ids "cN" existants. */
    int next = 1;
    cJSON *c;
    cJSON_ArrayForEach(c, party_chars()) {
        const char *id = json_str(c, "id");
        if (id && id[0] == 'c') next = clamp_int(atoi(id + 1) + 1, next, 1 << 30);
    }
    cJSON_SetNumberValue(cJSON_GetObjectItem(store_root(), "next"), next);

    store_mark_dirty();
    out->reply = msg_auth(true);
    out->broadcast = msg_state();
}
