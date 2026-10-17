#pragma once
#include <stddef.h>

/*
 * Protocole WebSocket (messages JSON, champ "t" = type).
 *
 * Client -> station :
 *   hello                              -> state
 *   auth     {pin}                     -> auth {ok, tokens}          (MJ)
 *   create   {char}                    -> created {id, token} + diffusion char
 *   patch    {id, set:{chemin:valeur}, token|pin}  -> diffusion char
 *   delete   {id, token|pin}           -> diffusion del
 *   claim    {id, token}               -> claim {ok, id, token}
 *   roll     {who, label, n, f, mod, keep:"h"|"l", rq, secret, pin}  -> diffusion log
 *   import   {pin, chars, tokens}      -> diffusion state            (MJ)
 *   clearlog {pin}                     -> diffusion state            (MJ)
 *   presence {dev, mine:{id:token}, pin} -> you {id} + diffusion peers
 *   combat   {pin, full, pub}          -> diffusion combat {combat: pub}  (MJ)
 *
 * state contient la version publique du combat, auth (MJ) la version complète.
 * Station -> clients : state, char, del, log, peers {list}, combat, err {m}
 */
typedef struct {
    char *reply;     /* à renvoyer à l'expéditeur seulement (malloc, ou NULL) */
    char *broadcast; /* à envoyer à tous les clients (malloc, ou NULL) */
} game_out_t;

/* fd : socket WebSocket de l'expéditeur (sert à suivre qui est connecté). */
void game_handle(const char *msg, size_t len, int fd, game_out_t *out);

/* Socket fermée : renvoie le message peers à diffuser (malloc), ou NULL. */
char *game_disconnect(int fd);
