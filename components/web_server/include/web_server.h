#pragma once
#include <stddef.h>

/* Réponse à un message WebSocket. */
typedef struct {
    char *reply;     /* à renvoyer à l'expéditeur seulement (malloc, ou NULL) */
    char *broadcast; /* à envoyer à tous les clients (malloc, ou NULL) */
} web_ws_out_t;

typedef struct {
    /* URL de l'appli (ex. "http://192.168.4.1/") : toute URL inconnue y est redirigée (portail captif). */
    const char *portal_url;
    /* Message texte reçu sur /ws ; fd identifie le client. Libère ensuite reply et broadcast. */
    void (*on_message)(int fd, const char *msg, size_t len, web_ws_out_t *out);
    /* Socket fermée : renvoie un message à diffuser aux autres clients (malloc), ou NULL. */
    char *(*on_close)(int fd);
} web_server_config_t;

/* Sert l'appli web (composant webapp) et le WebSocket /ws. */
void web_server_start(const web_server_config_t *config);
