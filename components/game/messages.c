#include "store.h"
#include "game_priv.h"

cJSON *msg_new(const char *type)
{
    cJSON *o = cJSON_CreateObject();
    cJSON_AddStringToObject(o, "t", type);
    return o;
}

char *msg_err(const char *text)
{
    cJSON *o = msg_new("err");
    cJSON_AddStringToObject(o, "m", text);
    return json_print_free(o);
}

/* État complet ; le combat n'y figure que dans sa version publique. */
char *msg_state(void)
{
    cJSON *o = msg_new("state");
    cJSON_AddNumberToObject(o, "now", game_now_ms());
    cJSON_AddItemReferenceToObject(o, "chars", party_chars());
    cJSON_AddItemReferenceToObject(o, "log", party_log());
    cJSON_AddItemReferenceToObject(o, "peers", peers_list());
    cJSON_AddItemReferenceToObject(o, "combat", cJSON_GetObjectItem(store_root(), "combat_pub"));
    cJSON_AddItemReferenceToObject(o, "lieux", lieux_list());
    cJSON_AddItemReferenceToObject(o, "avatars", avatar_list());
    cJSON_AddNumberToObject(o, "rv", party_rules_version());
    return json_print_free(o);
}

char *msg_char(cJSON *c)
{
    cJSON *o = msg_new("char");
    cJSON_AddItemReferenceToObject(o, "char", c);
    return json_print_free(o);
}

/* Réponse à l'authentification MJ : codes de reprise et combat complet. */
char *msg_auth(bool ok)
{
    cJSON *o = msg_new("auth");
    cJSON_AddBoolToObject(o, "ok", ok);
    if (ok) {
        cJSON_AddItemReferenceToObject(o, "tokens", party_tokens());
        cJSON_AddItemReferenceToObject(o, "combat", cJSON_GetObjectItem(store_root(), "combat"));
    }
    return json_print_free(o);
}

char *msg_peers(void)
{
    cJSON *o = msg_new("peers");
    cJSON_AddItemReferenceToObject(o, "list", peers_list());
    return json_print_free(o);
}
