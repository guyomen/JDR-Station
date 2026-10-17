#pragma once
/* Interne au composant game : partagé entre ses fichiers, invisible du reste du firmware.
 * Toutes ces fonctions s'appellent entre store_lock() et store_unlock(). */
#include <stdbool.h>
#include <stddef.h>
#include "cJSON.h"
#include "game.h"

/* ---------- Limites ---------- */
#define MAX_CHARS       12
#define MAX_CHAR_JSON   6144
#define MAX_LOG         60
#define MAX_COMBAT_JSON 6144
#define MAX_IMGS        40   /* ID d'images annoncés par un écran partagé */

/* Gestionnaire d'un type de message (champ "t"). */
typedef void (*game_handler_t)(const cJSON *m, int fd, game_out_t *out);

/* ---------- util.c : petits utilitaires ---------- */
const char *json_str(const cJSON *o, const char *key);
int json_int(const cJSON *o, const char *key, int def);
/* Ajoute une chaîne tronquée sans couper un caractère UTF-8 en deux. */
void json_add_str_trunc(cJSON *o, const char *key, const char *val, size_t max);
/* Écrit val au chemin "a.b.2.c" ; prend possession de val uniquement en cas de succès. */
bool json_set_path(cJSON *obj, const char *path, cJSON *val);
char *json_print_free(cJSON *o);
double game_now_ms(void);

static inline int clamp_int(int v, int lo, int hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ---------- party.c : état de la partie, droits ---------- */
void party_init(const char *mj_pin);
cJSON *party_chars(void);
cJSON *party_tokens(void);
cJSON *party_log(void);
cJSON *party_find_char(const char *id, int *index);
void party_new_id(char *out, size_t len);
void party_new_token(char out[7]);
bool party_char_fits(const cJSON *c);
bool party_is_mj(const cJSON *m);
bool party_is_owner(const cJSON *m, const char *id);

/* ---------- messages.c : messages envoyés aux clients ---------- */
cJSON *msg_new(const char *type);
char *msg_err(const char *text);
char *msg_state(void);
char *msg_char(cJSON *c);
char *msg_auth(bool ok);
char *msg_peers(void);

/* ---------- characters.c : fiches ---------- */
void chars_on_create(const cJSON *m, int fd, game_out_t *out);
void chars_on_patch(const cJSON *m, int fd, game_out_t *out);
void chars_on_delete(const cJSON *m, int fd, game_out_t *out);
void chars_on_claim(const cJSON *m, int fd, game_out_t *out);
void chars_on_import(const cJSON *m, int fd, game_out_t *out);

/* ---------- dice.c : dés et journal ---------- */
void dice_on_roll(const cJSON *m, int fd, game_out_t *out);
void dice_on_clearlog(const cJSON *m, int fd, game_out_t *out);

/* ---------- peers.c : appareils connectés (en mémoire seulement) ---------- */
cJSON *peers_list(void);
void peers_on_presence(const cJSON *m, int fd, game_out_t *out);
/* Oublie l'appareil ; renvoie le message peers à diffuser, ou NULL s'il était inconnu. */
char *peers_remove(int fd);

/* ---------- combat.c : initiative et PNJ ---------- */
void combat_on_update(const cJSON *m, int fd, game_out_t *out);
