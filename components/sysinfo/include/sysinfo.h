#pragma once
#include "cJSON.h"

/*
 * État de la station pour le MJ (onglet Outils) :
 *   { "up": s, "temp": °C, "heap": {free, min, big, total}, "fs": {total, used},
 *     "wifi": {ch, rssi: [dBm…]}, "chip", "cpu": MHz, "flash": octets, "idf", "app", "built", "reset", "tasks" }
 * "temp" est absent si le capteur interne est indisponible.
 */

/* Démarre le capteur de température interne. */
void sysinfo_init(void);

/* Mesures du moment (à libérer par l'appelant). */
cJSON *sysinfo_json(void);
