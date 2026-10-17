#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <strings.h>
#include "esp_random.h"
#include "esp_timer.h"
#include "sdkconfig.h"
#include "cJSON.h"
#include "store.h"
#include "game.h"

#define MAX_CHARS     12
#define MAX_CHAR_JSON 6144
#define MAX_LOG       60
#define MAX_PATH_SEGS 6
#define MAX_KEY_LEN   32
#define MAX_COMBAT_JSON 6144
#define MAX_IMGS      40   /* ID d'images annoncés par un écran partagé */

/* ---------- Petits utilitaires JSON ---------- */

static const char *jstr(const cJSON *o, const char *key)
{
    const cJSON *v = cJSON_GetObjectItemCaseSensitive(o, key);
    return cJSON_IsString(v) ? v->valuestring : NULL;
}

static int jint(const cJSON *o, const char *key, int def)
{
    const cJSON *v = cJSON_GetObjectItemCaseSensitive(o, key);
    return cJSON_IsNumber(v) ? v->valueint : def;
}

static int clamp(int v, int lo, int hi) { return v < lo ? lo : v > hi ? hi : v; }

/* Ajoute une chaîne tronquée sans couper un caractère UTF-8 en deux. */
static void add_str_trunc(cJSON *o, const char *key, const char *val, size_t max)
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

static char *print_and_free(cJSON *o)
{
    char *s = cJSON_PrintUnformatted(o);
    cJSON_Delete(o);
    return s;
}

static cJSON *msg_new(const char *type)
{
    cJSON *o = cJSON_CreateObject();
    cJSON_AddStringToObject(o, "t", type);
    return o;
}

static char *msg_err(const char *text)
{
    cJSON *o = msg_new("err");
    cJSON_AddStringToObject(o, "m", text);
    return print_and_free(o);
}

/* ---------- Accès à l'état ---------- */

static cJSON *chars(void)  { return cJSON_GetObjectItem(store_root(), "chars"); }
static cJSON *tokens(void) { return cJSON_GetObjectItem(store_root(), "tokens"); }
static cJSON *logs(void)   { return cJSON_GetObjectItem(store_root(), "log"); }

static double now_ms(void) { return (double)(esp_timer_get_time() / 1000); }

/* Appareils connectés (en mémoire seulement) : [{id: fd, mj, dev, chars: [ids], since}]. */
static cJSON *s_peers;

static cJSON *peers(void)
{
    if (!s_peers) s_peers = cJSON_CreateArray();
    return s_peers;
}

static cJSON *find_char(const char *id, int *index)
{
    if (!id) return NULL;
    int i = 0;
    cJSON *c;
    cJSON_ArrayForEach(c, chars()) {
        const char *cid = jstr(c, "id");
        if (cid && strcmp(cid, id) == 0) {
            if (index) *index = i;
            return c;
        }
        i++;
    }
    return NULL;
}

static bool is_mj(const cJSON *m)
{
    const char *pin = jstr(m, "pin");
    return pin && strcmp(pin, CONFIG_JDR_MJ_PIN) == 0;
}

static bool is_owner(const cJSON *m, const char *id)
{
    const char *tok = jstr(m, "token");
    const char *ref = id ? jstr(tokens(), id) : NULL;
    return tok && ref && strcasecmp(tok, ref) == 0;
}

static void new_token(char out[7])
{
    static const char alphabet[] = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (int i = 0; i < 6; i++) out[i] = alphabet[esp_random() % 32];
    out[6] = '\0';
}

static void new_id(char *out, size_t len)
{
    cJSON *next = cJSON_GetObjectItem(store_root(), "next");
    int n = next->valueint;
    do {
        snprintf(out, len, "c%d", n++);
    } while (find_char(out, NULL));
    cJSON_SetNumberValue(next, n);
}

static bool char_size_ok(const cJSON *c)
{
    char *s = cJSON_PrintUnformatted(c);
    bool ok = s && strlen(s) <= MAX_CHAR_JSON;
    free(s);
    return ok;
}

static char *state_msg(void)
{
    cJSON *o = msg_new("state");
    cJSON_AddNumberToObject(o, "now", now_ms());
    cJSON_AddItemReferenceToObject(o, "chars", chars());
    cJSON_AddItemReferenceToObject(o, "log", logs());
    cJSON_AddItemReferenceToObject(o, "peers", peers());
    cJSON_AddItemReferenceToObject(o, "combat", cJSON_GetObjectItem(store_root(), "combat_pub"));
    return print_and_free(o);
}

static char *peers_msg(void)
{
    cJSON *o = msg_new("peers");
    cJSON_AddItemReferenceToObject(o, "list", peers());
    return print_and_free(o);
}

static cJSON *find_peer(int fd, int *index)
{
    int i = 0;
    cJSON *p;
    cJSON_ArrayForEach(p, peers()) {
        if (jint(p, "id", -1) == fd) {
            if (index) *index = i;
            return p;
        }
        i++;
    }
    return NULL;
}

static char *char_msg(cJSON *c)
{
    cJSON *o = msg_new("char");
    cJSON_AddItemReferenceToObject(o, "char", c);
    return print_and_free(o);
}

static char *auth_msg(bool ok)
{
    cJSON *o = msg_new("auth");
    cJSON_AddBoolToObject(o, "ok", ok);
    if (ok) {
        cJSON_AddItemReferenceToObject(o, "tokens", tokens());
        cJSON_AddItemReferenceToObject(o, "combat", cJSON_GetObjectItem(store_root(), "combat"));
    }
    return print_and_free(o);
}

/*
 * Écrit val à l'emplacement "a.b.2.c" dans obj (objets créés au besoin,
 * index de tableau = position existante ou ajout en fin).
 * Prend possession de val uniquement en cas de succès.
 */
static bool set_path(cJSON *obj, const char *path, cJSON *val)
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

/* ---------- Messages ---------- */

static void on_create(const cJSON *m, game_out_t *out)
{
    const cJSON *src = cJSON_GetObjectItem(m, "char");
    if (!cJSON_IsObject(src)) { out->reply = msg_err("Fiche invalide"); return; }
    if (cJSON_GetArraySize(chars()) >= MAX_CHARS) {
        out->reply = msg_err("Nombre maximum de personnages atteint");
        return;
    }

    cJSON *c = cJSON_Duplicate(src, true);
    char id[12], tok[7];
    new_id(id, sizeof(id));
    cJSON_DeleteItemFromObjectCaseSensitive(c, "id");
    cJSON_AddStringToObject(c, "id", id);
    if (!char_size_ok(c)) {
        cJSON_Delete(c);
        out->reply = msg_err("Fiche trop volumineuse");
        return;
    }
    cJSON_AddItemToArray(chars(), c);
    new_token(tok);
    cJSON_AddStringToObject(tokens(), id, tok);
    store_mark_dirty();

    cJSON *r = msg_new("created");
    cJSON_AddStringToObject(r, "id", id);
    cJSON_AddStringToObject(r, "token", tok);
    out->reply = print_and_free(r);
    out->broadcast = char_msg(c);
}

static void on_patch(const cJSON *m, game_out_t *out)
{
    const char *id = jstr(m, "id");
    int index;
    cJSON *c = find_char(id, &index);
    if (!c) { out->reply = msg_err("Personnage introuvable"); return; }
    if (!is_mj(m) && !is_owner(m, id)) { out->reply = msg_err("Modification non autorisee"); return; }
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
        if (!set_path(copy, path, val)) {
            cJSON_Delete(val);
            goto fail;
        }
    }
    if (!char_size_ok(copy)) {
        cJSON_Delete(copy);
        out->reply = msg_err("Fiche trop volumineuse");
        return;
    }
    cJSON_ReplaceItemInArray(chars(), index, copy);
    store_mark_dirty();
    out->broadcast = char_msg(copy);
    return;

fail:
    cJSON_Delete(copy);
    out->reply = msg_err("Modification invalide");
}

static void on_delete(const cJSON *m, game_out_t *out)
{
    const char *id = jstr(m, "id");
    int index;
    if (!find_char(id, &index)) return;
    if (!is_mj(m) && !is_owner(m, id)) { out->reply = msg_err("Suppression non autorisee"); return; }

    cJSON *o = msg_new("del");
    cJSON_AddStringToObject(o, "id", id); /* copie avant suppression de la fiche */
    cJSON_DeleteItemFromObjectCaseSensitive(tokens(), id);
    cJSON_DeleteItemFromArray(chars(), index);
    store_mark_dirty();
    out->broadcast = print_and_free(o);
}

static void on_claim(const cJSON *m, game_out_t *out)
{
    const char *id = jstr(m, "id");
    bool ok = find_char(id, NULL) && is_owner(m, id);
    cJSON *o = msg_new("claim");
    cJSON_AddBoolToObject(o, "ok", ok);
    if (ok) {
        cJSON_AddStringToObject(o, "id", id);
        cJSON_AddStringToObject(o, "token", jstr(tokens(), id));
    }
    out->reply = print_and_free(o);
}

static int roll_die(int faces) { return (int)(esp_random() % (uint32_t)faces) + 1; }

static void on_roll(const cJSON *m, game_out_t *out)
{
    int n = clamp(jint(m, "n", 1), 1, 20);
    int f = clamp(jint(m, "f", 20), 2, 1000);
    int mod = clamp(jint(m, "mod", 0), -999, 999);
    const char *keep = jstr(m, "keep");
    char kmode = (n == 1 && keep && (keep[0] == 'h' || keep[0] == 'l')) ? keep[0] : 0;

    cJSON *e = cJSON_CreateObject();
    cJSON_AddNumberToObject(e, "ts", now_ms());
    add_str_trunc(e, "who", jstr(m, "who"), 40);
    add_str_trunc(e, "label", jstr(m, "label"), 60);
    if (jstr(m, "rq")) add_str_trunc(e, "rq", jstr(m, "rq"), 16);

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
    if (cJSON_IsTrue(cJSON_GetObjectItem(m, "secret")) && is_mj(m)) {
        cJSON_AddTrueToObject(e, "secret");
        cJSON_AddItemToObject(o, "e", e);
        out->reply = print_and_free(o);
        return;
    }
    cJSON_AddItemToArray(logs(), e);
    while (cJSON_GetArraySize(logs()) > MAX_LOG) cJSON_DeleteItemFromArray(logs(), 0);
    store_mark_dirty();
    cJSON_AddItemReferenceToObject(o, "e", e);
    out->broadcast = print_and_free(o);
}

static void on_import(const cJSON *m, game_out_t *out)
{
    if (!is_mj(m)) { out->reply = msg_err("Reserve au MJ"); return; }
    const cJSON *src = cJSON_GetObjectItem(m, "chars");
    if (!cJSON_IsArray(src)) { out->reply = msg_err("Fichier invalide"); return; }
    const cJSON *src_tokens = cJSON_GetObjectItem(m, "tokens");

    /* On repart de zéro : les ids importés sont conservés quand c'est possible. */
    cJSON *old_tokens = cJSON_DetachItemFromObject(store_root(), "tokens");
    cJSON_ReplaceItemInObject(store_root(), "chars", cJSON_CreateArray());
    cJSON_AddItemToObject(store_root(), "tokens", cJSON_CreateObject());

    const cJSON *item;
    cJSON_ArrayForEach(item, src) {
        if (!cJSON_IsObject(item) || cJSON_GetArraySize(chars()) >= MAX_CHARS) continue;
        cJSON *c = cJSON_Duplicate(item, true);
        const char *id = jstr(c, "id");
        char idbuf[12];
        if (!id || strlen(id) >= sizeof(idbuf) || find_char(id, NULL)) {
            new_id(idbuf, sizeof(idbuf));
            cJSON_DeleteItemFromObjectCaseSensitive(c, "id");
            cJSON_AddStringToObject(c, "id", idbuf);
        } else {
            strcpy(idbuf, id);
        }
        if (!char_size_ok(c)) {
            cJSON_Delete(c);
            continue;
        }
        cJSON_AddItemToArray(chars(), c);

        const char *tok = jstr(src_tokens, idbuf);
        if (!tok) tok = jstr(old_tokens, idbuf);
        char fresh[7];
        if (!tok || strlen(tok) != 6) {
            new_token(fresh);
            tok = fresh;
        }
        cJSON_AddStringToObject(tokens(), idbuf, tok);
    }
    cJSON_Delete(old_tokens);

    /* Le compteur d'ids doit dépasser tous les ids "cN" existants. */
    int next = 1;
    cJSON *c;
    cJSON_ArrayForEach(c, chars()) {
        const char *id = jstr(c, "id");
        if (id && id[0] == 'c') next = clamp(atoi(id + 1) + 1, next, 1 << 30);
    }
    cJSON_SetNumberValue(cJSON_GetObjectItem(store_root(), "next"), next);

    store_mark_dirty();
    out->reply = auth_msg(true);
    out->broadcast = state_msg();
}

/* Un appareil se présente : ses personnages (vérifiés par leur code de reprise) et son rôle. */
static void on_presence(const cJSON *m, int fd, game_out_t *out)
{
    int index;
    cJSON *old = find_peer(fd, &index);
    double since = old ? cJSON_GetNumberValue(cJSON_GetObjectItem(old, "since")) : now_ms();

    cJSON *p = cJSON_CreateObject();
    cJSON_AddNumberToObject(p, "id", fd);
    cJSON_AddBoolToObject(p, "mj", is_mj(m));
    add_str_trunc(p, "dev", jstr(m, "dev"), 16);
    cJSON_AddNumberToObject(p, "since", since);
    cJSON *ids = cJSON_AddArrayToObject(p, "chars");
    const cJSON *mine = cJSON_GetObjectItem(m, "mine");
    const cJSON *kv;
    cJSON_ArrayForEach(kv, mine) {
        const char *ref = find_char(kv->string, NULL) ? jstr(tokens(), kv->string) : NULL;
        if (ref && cJSON_IsString(kv) && strcasecmp(kv->valuestring, ref) == 0)
            cJSON_AddItemToArray(ids, cJSON_CreateString(kv->string));
    }

    /* Écran partagé : ID des images de lieux qu'il a en local (proposés au MJ). */
    const cJSON *imgs = cJSON_GetObjectItem(m, "imgs");
    if (cJSON_IsArray(imgs)) {
        cJSON *arr = cJSON_AddArrayToObject(p, "imgs");
        int count = 0;
        const cJSON *img;
        cJSON_ArrayForEach(img, imgs) {
            if (!cJSON_IsString(img) || count++ >= MAX_IMGS) continue;
            cJSON *tmp = cJSON_CreateObject();
            add_str_trunc(tmp, "v", img->valuestring, 32);
            cJSON_AddItemToArray(arr, cJSON_DetachItemFromObject(tmp, "v"));
            cJSON_Delete(tmp);
        }
    }

    if (old) cJSON_ReplaceItemInArray(peers(), index, p);
    else cJSON_AddItemToArray(peers(), p);

    cJSON *r = msg_new("you");
    cJSON_AddNumberToObject(r, "id", fd);
    out->reply = print_and_free(r);
    out->broadcast = peers_msg();
}

/* Initiative et PNJ : le MJ envoie la version complète (gardée pour lui) et la version
 * publique (PNJ visibles, santé en couleur) diffusée à tous. */
static void on_combat(const cJSON *m, game_out_t *out)
{
    if (!is_mj(m)) { out->reply = msg_err("Reserve au MJ"); return; }
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
    out->broadcast = print_and_free(o);
}

static void on_clearlog(const cJSON *m, game_out_t *out)
{
    if (!is_mj(m)) { out->reply = msg_err("Reserve au MJ"); return; }
    cJSON_ReplaceItemInObject(store_root(), "log", cJSON_CreateArray());
    store_mark_dirty();
    out->broadcast = state_msg();
}

void game_handle(const char *msg, size_t len, int fd, game_out_t *out)
{
    out->reply = NULL;
    out->broadcast = NULL;

    cJSON *m = cJSON_ParseWithLength(msg, len);
    const char *t = jstr(m, "t");
    if (!t) {
        cJSON_Delete(m);
        return;
    }

    store_lock();
    if (!strcmp(t, "hello"))         out->reply = state_msg();
    else if (!strcmp(t, "auth"))     out->reply = auth_msg(is_mj(m));
    else if (!strcmp(t, "create"))   on_create(m, out);
    else if (!strcmp(t, "patch"))    on_patch(m, out);
    else if (!strcmp(t, "delete"))   on_delete(m, out);
    else if (!strcmp(t, "claim"))    on_claim(m, out);
    else if (!strcmp(t, "roll"))     on_roll(m, out);
    else if (!strcmp(t, "import"))   on_import(m, out);
    else if (!strcmp(t, "clearlog")) on_clearlog(m, out);
    else if (!strcmp(t, "presence")) on_presence(m, fd, out);
    else if (!strcmp(t, "combat"))   on_combat(m, out);
    store_unlock();

    cJSON_Delete(m);
}

char *game_disconnect(int fd)
{
    char *msg = NULL;
    int index;
    store_lock();
    if (find_peer(fd, &index)) {
        cJSON_DeleteItemFromArray(peers(), index);
        msg = peers_msg();
    }
    store_unlock();
    return msg;
}
