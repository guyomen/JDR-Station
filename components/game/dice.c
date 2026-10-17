/* Jets de dés (générateur aléatoire matériel) et journal partagé. */
#include <stdio.h>
#include "esp_random.h"
#include "store.h"
#include "game_priv.h"

static int roll_die(int faces) { return (int)(esp_random() % (uint32_t)faces) + 1; }

void dice_on_roll(const cJSON *m, int fd, game_out_t *out)
{
    int n = clamp_int(json_int(m, "n", 1), 1, 20);
    int f = clamp_int(json_int(m, "f", 20), 2, 1000);
    int mod = clamp_int(json_int(m, "mod", 0), -999, 999);
    const char *keep = json_str(m, "keep");
    char kmode = (n == 1 && keep && (keep[0] == 'h' || keep[0] == 'l')) ? keep[0] : 0;

    cJSON *e = cJSON_CreateObject();
    cJSON_AddNumberToObject(e, "ts", game_now_ms());
    json_add_str_trunc(e, "who", json_str(m, "who"), 40);
    json_add_str_trunc(e, "label", json_str(m, "label"), 60);
    if (json_str(m, "rq")) json_add_str_trunc(e, "rq", json_str(m, "rq"), 16);

    char formula[32];
    if (mod) snprintf(formula, sizeof(formula), "%dd%d%+d", n, f, mod);
    else snprintf(formula, sizeof(formula), "%dd%d", n, f);
    cJSON_AddStringToObject(e, "f", formula);
    cJSON_AddNumberToObject(e, "faces", f);

    cJSON *rolls = cJSON_AddArrayToObject(e, "rolls");
    int sum = 0;
    if (kmode) {
        /* Dé bonus / dé malus : on lance deux dés et on garde le meilleur / le pire. */
        int a = roll_die(f), b = roll_die(f);
        cJSON_AddItemToArray(rolls, cJSON_CreateNumber(a));
        cJSON_AddItemToArray(rolls, cJSON_CreateNumber(b));
        sum = (kmode == 'h') ? (a > b ? a : b) : (a < b ? a : b);
        cJSON_AddStringToObject(e, "keep", kmode == 'h' ? "h" : "l");
    } else {
        for (int i = 0; i < n; i++) {
            int r = roll_die(f);
            cJSON_AddItemToArray(rolls, cJSON_CreateNumber(r));
            sum += r;
        }
    }
    if (n == 1) cJSON_AddNumberToObject(e, "nat", sum);
    cJSON_AddNumberToObject(e, "total", sum + mod);

    cJSON *o = msg_new("log");
    if (cJSON_IsTrue(cJSON_GetObjectItem(m, "secret")) && party_is_mj(m)) {
        cJSON_AddTrueToObject(e, "secret");
        cJSON_AddItemToObject(o, "e", e);
        out->reply = json_print_free(o);
        return;
    }
    cJSON_AddItemToArray(party_log(), e);
    while (cJSON_GetArraySize(party_log()) > MAX_LOG) cJSON_DeleteItemFromArray(party_log(), 0);
    store_mark_dirty();
    cJSON_AddItemReferenceToObject(o, "e", e);
    out->broadcast = json_print_free(o);
}

void dice_on_clearlog(const cJSON *m, int fd, game_out_t *out)
{
    if (!party_is_mj(m)) { out->reply = msg_err("Reserve au MJ"); return; }
    cJSON_ReplaceItemInObject(store_root(), "log", cJSON_CreateArray());
    store_mark_dirty();
    out->broadcast = msg_state();
}
