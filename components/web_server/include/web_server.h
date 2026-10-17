#pragma once
#include <stdbool.h>
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
    /* Fichiers servis depuis le système de fichiers (miniatures) : l'URI files_uri + nom (ex. "/av/c1.jpg")
     * lit files_root + URI ("/data/av/c1.jpg"). Les URL doivent être versionnées : cache d'un an. NULL : aucun. */
    const char *files_uri;
    const char *files_root;
    /* Documents embarqués remplaçables par le MJ (règles de la table), sous docs_uri (ex. "/regles/") :
     *   GET    uri + nom      : docs_root + nom + ".gz" s'il existe, sinon le document embarqué
     *                           (« ?origine » : toujours l'embarqué) ;
     *   PUT    uri + nom      : en-tête X-Pin (vérifié par docs_auth), corps compressé en gzip : remplace le document ;
     *   DELETE uri + nom      : revient au document embarqué ;
     *   GET    uri index.json : { "nom": octets, … } des documents remplacés.
     * Seuls les noms de documents embarqués sous docs_uri sont acceptés. Après un changement (sauf en-tête
     * X-Suite : d'autres suivent), docs_changed renvoie le message à diffuser aux clients WebSocket (malloc).
     * docs_free : place libre (octets). docs_uri NULL : aucun document remplaçable. */
    const char *docs_uri;
    const char *docs_root;
    bool (*docs_auth)(const char *pin);
    size_t (*docs_free)(void);
    char *(*docs_changed)(void);
} web_server_config_t;

/* Sert l'appli web (composant webapp) et le WebSocket /ws. */
void web_server_start(const web_server_config_t *config);
