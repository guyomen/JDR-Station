#pragma once
#include <stdbool.h>
#include <stddef.h>

/*
 * Logique de la partie : traite les messages JSON des clients WebSocket.
 * Protocole complet : docs/protocol.md. L'état est persisté par le composant store.
 */

typedef struct {
    char *reply;     /* à renvoyer à l'expéditeur seulement (malloc, ou NULL) */
    char *broadcast; /* à envoyer à tous les clients (malloc, ou NULL) */
} game_out_t;

/* mj_pin : code PIN du MJ (copié). À appeler après store_init(). */
void game_init(const char *mj_pin);

/* fd : socket WebSocket de l'expéditeur (sert à suivre qui est connecté). */
void game_handle(const char *msg, size_t len, int fd, game_out_t *out);

/* Socket fermée : renvoie le message peers à diffuser (malloc), ou NULL. */
char *game_disconnect(int fd);

/* Vrai si pin est le code du MJ (envoi des documents de règles par HTTP). */
bool game_check_pin(const char *pin);

/* Les documents de règles de la table ont changé : nouvelle version, et message « regles » à diffuser (malloc). */
char *game_rules_changed(void);
