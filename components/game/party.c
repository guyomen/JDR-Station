#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include "esp_random.h"
#include "store.h"
#include "game_priv.h"

static char s_mj_pin[33];

static int s_rules_v;

void party_init(const char *mj_pin)
{
    strlcpy(s_mj_pin, mj_pin, sizeof(s_mj_pin));
    /* Au hasard : un appareil resté hors ligne pendant un envoi puis un redémarrage voit quand même le changement. */
    s_rules_v = (int)(esp_random() & 0x3fffffff);
}

int party_rules_version(void) { return s_rules_v; }
void party_rules_bump(void) { s_rules_v = (s_rules_v + 1) & 0x3fffffff; }
bool party_pin_ok(const char *pin) { return pin && s_mj_pin[0] && strcmp(pin, s_mj_pin) == 0; }

cJSON *party_chars(void)  { return cJSON_GetObjectItem(store_root(), "chars"); }
cJSON *party_tokens(void) { return cJSON_GetObjectItem(store_root(), "tokens"); }
cJSON *party_log(void)    { return cJSON_GetObjectItem(store_root(), "log"); }

cJSON *party_find_char(const char *id, int *index)
{
    if (!id) return NULL;
    int i = 0;
    cJSON *c;
    cJSON_ArrayForEach(c, party_chars()) {
        const char *cid = json_str(c, "id");
        if (cid && strcmp(cid, id) == 0) {
            if (index) *index = i;
            return c;
        }
        i++;
    }
    return NULL;
}

bool party_is_mj(const cJSON *m)
{
    const char *pin = json_str(m, "pin");
    return pin && strcmp(pin, s_mj_pin) == 0;
}

/* Le code de reprise (token) donne les droits sur le personnage. */
bool party_is_owner(const cJSON *m, const char *id)
{
    const char *tok = json_str(m, "token");
    const char *ref = id ? json_str(party_tokens(), id) : NULL;
    return tok && ref && strcasecmp(tok, ref) == 0;
}

void party_new_token(char out[7])
{
    static const char alphabet[] = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (int i = 0; i < 6; i++) out[i] = alphabet[esp_random() % 32];
    out[6] = '\0';
}

void party_new_id(char *out, size_t len)
{
    cJSON *next = cJSON_GetObjectItem(store_root(), "next");
    int n = next->valueint;
    do {
        snprintf(out, len, "c%d", n++);
    } while (party_find_char(out, NULL));
    cJSON_SetNumberValue(next, n);
}

bool party_char_fits(const cJSON *c)
{
    char *s = cJSON_PrintUnformatted(c);
    bool ok = s && strlen(s) <= MAX_CHAR_JSON;
    free(s);
    return ok;
}
