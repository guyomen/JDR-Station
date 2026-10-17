#pragma once
#include <stdbool.h>
#include "esp_err.h"
#include "cJSON.h"

/*
 * État de la partie, persisté dans /data/party.json (SPIFFS) :
 *   { "next": 1, "chars": [ {fiche}... ], "tokens": { "c1": "ABC123" }, "log": [ {jet}... ] }
 * Les fiches sont du JSON libre : c'est l'appli web qui définit leur contenu.
 */
esp_err_t store_init(void);

/* Accès à la racine : toujours entre store_lock() et store_unlock(). */
void store_lock(void);
void store_unlock(void);
cJSON *store_root(void);

/* Demande une sauvegarde (écrite en flash quelques secondes plus tard). */
void store_mark_dirty(void);
