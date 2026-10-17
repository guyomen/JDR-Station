/* Point d'entrée du composant : aiguillage des messages vers leur gestionnaire. */
#include <string.h>
#include "store.h"
#include "sysinfo.h"
#include "game_priv.h"

static void on_hello(const cJSON *m, int fd, game_out_t *out) { out->reply = msg_state(); }
static void on_auth(const cJSON *m, int fd, game_out_t *out)  { out->reply = msg_auth(party_is_mj(m)); }

/* État de la station (mémoire, flash, température…) : MJ seulement. */
static void on_sys(const cJSON *m, int fd, game_out_t *out)
{
    if (!party_is_mj(m)) { out->reply = msg_err("Reserve au MJ"); return; }
    cJSON *o = msg_new("sys");
    cJSON_AddItemToObject(o, "sys", sysinfo_json());
    cJSON_AddNumberToObject(o, "peers", cJSON_GetArraySize(peers_list()));
    out->reply = json_print_free(o);
}

static const struct {
    const char *type;
    game_handler_t fn;
} HANDLERS[] = {
    { "hello",    on_hello },
    { "auth",     on_auth },
    { "create",   chars_on_create },
    { "patch",    chars_on_patch },
    { "delete",   chars_on_delete },
    { "claim",    chars_on_claim },
    { "import",   chars_on_import },
    { "roll",     dice_on_roll },
    { "clearlog", dice_on_clearlog },
    { "presence", peers_on_presence },
    { "combat",   combat_on_update },
    { "lieux",    lieux_on_update },
    { "avatar",   avatar_on_update },
    { "sys",      on_sys },
};

void game_init(const char *mj_pin)
{
    party_init(mj_pin);
}

void game_handle(const char *msg, size_t len, int fd, game_out_t *out)
{
    out->reply = NULL;
    out->broadcast = NULL;

    cJSON *m = cJSON_ParseWithLength(msg, len);
    const char *t = json_str(m, "t");
    if (!t) {
        cJSON_Delete(m);
        return;
    }

    for (size_t i = 0; i < sizeof(HANDLERS) / sizeof(HANDLERS[0]); i++) {
        if (strcmp(t, HANDLERS[i].type) == 0) {
            store_lock();
            HANDLERS[i].fn(m, fd, out);
            store_unlock();
            break;
        }
    }
    cJSON_Delete(m);
}

bool game_check_pin(const char *pin)
{
    return party_pin_ok(pin);
}

char *game_rules_changed(void)
{
    store_lock();
    party_rules_bump();
    cJSON *o = msg_new("regles");
    cJSON_AddNumberToObject(o, "v", party_rules_version());
    store_unlock();
    return json_print_free(o);
}

char *game_disconnect(int fd)
{
    store_lock();
    char *msg = peers_remove(fd);
    store_unlock();
    return msg;
}
