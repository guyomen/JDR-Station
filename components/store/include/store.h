#pragma once
#include <stdbool.h>
#include <stddef.h>
#include "esp_err.h"
#include "cJSON.h"

/*
 * État de la partie, persisté dans /data/party.json (SPIFFS) :
 *   { "next": 1, "chars": [ {fiche}... ], "tokens": { "c1": "ABC123" }, "log": [ {jet}... ],
 *     "combat": {}, "combat_pub": {}, "lieux": [ {id, n}... ], "avatars": { "c1": 3 }, "avnext": 4 }
 * Les fiches sont du JSON libre : c'est l'appli web qui définit leur contenu.
 */
esp_err_t store_init(void);

/* Accès à la racine : toujours entre store_lock() et store_unlock(). */
void store_lock(void);
void store_unlock(void);
cJSON *store_root(void);

/* Demande une sauvegarde (écrite en flash quelques secondes plus tard). */
void store_mark_dirty(void);

/* Fichiers binaires à part de party.json (miniatures) : name est relatif à STORE_BASE_PATH
 * (ex. "av/c1.jpg"). Écriture complète ou rien ; false si la flash est pleine. */
#define STORE_BASE_PATH "/data"
bool store_file_write(const char *name, const void *data, size_t len);
void store_file_remove(const char *name);

/* Espace de la partition de données (octets) ; false si indisponible. */
bool store_usage(size_t *total, size_t *used);
