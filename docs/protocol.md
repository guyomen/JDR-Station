# Protocole WebSocket

L'appli web et la station échangent des messages JSON sur `ws://192.168.4.1/ws`.
Le champ `t` donne le type du message.

- Côté station : [components/game/](../components/game/) (un fichier par domaine, aiguillage dans `game.c`).
- Côté appli : envoi dans [js/net.js](../components/webapp/www/js/net.js) et les actions de l'interface,
  réception dans [js/messages.js](../components/webapp/www/js/messages.js).

## Droits

| Preuve | Donne le droit de |
|---|---|
| `pin` = code PIN du MJ | tout (import, combat, journal, jets secrets, toute fiche) |
| `token` = code de reprise du personnage | modifier ou supprimer ce personnage |

C'est une protection « entre amis » : le réseau est local et le trafic n'est pas chiffré.

## Client → station

| `t` | Champs | Réponse à l'expéditeur | Diffusion à tous |
|---|---|---|---|
| `hello` | | `state` | |
| `auth` | `pin` | `auth {ok, tokens, combat}` | |
| `create` | `char` | `created {id, token}` | `char` |
| `patch` | `id`, `set: {chemin: valeur}`, `token` ou `pin` | `err` si refusé | `char` |
| `delete` | `id`, `token` ou `pin` | `err` si refusé | `del {id}` |
| `claim` | `id`, `token` | `claim {ok, id, token}` | |
| `roll` | `who`, `label`, `n`, `f`, `mod`, `keep: "h"\|"l"`, `rq`, `secret`, `pin` | `log` (jet secret du MJ) | `log` |
| `import` | `pin`, `chars`, `tokens` | `auth` | `state` |
| `clearlog` | `pin` | | `state` |
| `presence` | `dev`, `player`, `mine: {id: token}`, `pin`, `screen` | `you {id}` | `peers` |
| `combat` | `pin`, `full`, `pub` | | `combat {combat: pub}` |
| `lieux` | `list: [{id, n}]` | `err` si invalide | `lieux {list}` |
| `avatar` | `id`, `data` (JPEG en base64, `""` pour retirer), `token` ou `pin` | `err` si refusé | `avatar {id, v}` |

Précisions :

- **patch** : les chemins sont de la forme `a.b.2.c` (6 niveaux max., clés de 32 caractères max.).
  Tout ou rien : si un chemin est invalide, aucune modification n'est appliquée. `id` n'est pas modifiable.
- **roll** : `n` dés à `f` faces + `mod`. `keep` (dé bonus / malus) lance deux d20 et garde le
  meilleur / le pire. `rq` identifie la demande pour que seul l'expéditeur affiche le résultat.
- **presence** : un appareil annonce le nom de son utilisateur, ses personnages (vérifiés par leur code), son rôle MJ et
  s'il est en mode écran partagé (`screen: true`).
- **lieux** : l'appareil de l'écran partagé annonce les lieux dont il a l'image (`id` : 32 caractères ASCII,
  `n` : nom affiché). La liste remplace la précédente et est sauvegardée ; le MJ choisit le lieu affiché parmi elle.
  Les images restent dans le navigateur de l'écran. Pas de preuve demandée : l'écran n'a ni PIN ni personnage.
- **avatar** : miniature du personnage, préparée par l'appli (carré de 192 px, JPEG ≤ 15 Ko). La station vérifie
  la signature JPEG, l'écrit dans `/data/av/<id>.jpg` et diffuse sa nouvelle version `v` (0 = retirée).
  Elle est servie en HTTP sur `GET /av/<id>.jpg?v=<v>`, avec un cache d'un an : chaque envoi change `v`.
  Supprimer le personnage supprime sa miniature ; un import les supprime toutes (elles ne sont pas exportées).
- **combat** : le MJ envoie la version complète (`full`, gardée pour lui, renvoyée dans `auth`)
  et la version publique (`pub` : PNJ visibles, santé en couleur, lieu affiché `bg`).

## Station → client

| `t` | Contenu |
|---|---|
| `state` | `now` (horloge de la station, ms), `chars`, `log`, `peers`, `combat` (version publique), `lieux`, `avatars` (`{id: v}`) |
| `char` | `char` : fiche créée ou modifiée |
| `del` | `id` : fiche supprimée |
| `log` | `e` : jet de dés `{ts, who, label, f, faces, rolls, nat, total, keep, rq, secret}` |
| `peers` | `list` : appareils connectés `[{id, mj, dev, player, chars, since, screen}]` |
| `lieux` | `list` : lieux disponibles `[{id, n}]` |
| `avatar` | `id`, `v` : nouvelle version de la miniature (0 = retirée) |
| `combat` | `combat` : version publique du combat |
| `auth`, `created`, `claim`, `you` | réponses (voir plus haut) |
| `err` | `m` : message d'erreur à afficher |

## Persistance

L'état est sauvegardé dans `/data/party.json` (SPIFFS), quelques secondes après chaque modification :

```json
{ "next": 1, "chars": [], "tokens": { "c1": "ABC123" }, "log": [], "combat": {}, "combat_pub": {}, "lieux": [],
  "avatars": { "c1": 3 }, "avnext": 4 }
```

Les fiches sont du JSON libre : c'est l'appli web qui définit leur contenu.
Les miniatures sont des fichiers à part (`/data/av/<id>.jpg`) ; `avnext` donne la prochaine version.

## Limites

Définies dans [components/game/game_priv.h](../components/game/game_priv.h) :
12 personnages, 6 Ko par fiche, 60 jets dans le journal, 6 Ko par version du combat,
40 lieux, 16 Ko par miniature (192 Ko au plus en flash), 80 Ko par message reçu.
