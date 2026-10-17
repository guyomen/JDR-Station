# Protocole WebSocket

L'appli web et la station échangent des messages JSON sur `ws://192.168.4.1/ws`
(et, pour les règles de la table, quelques requêtes HTTP : voir plus bas).
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
| `sys` | `pin` | `sys {sys, peers}` | |

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
- **sys** : état de la station, demandé toutes les 5 s tant que l'onglet *Outils* du MJ est affiché
  ([components/sysinfo/](../components/sysinfo/)). `peers` : nombre d'appareils connectés à l'appli.
- **combat** : le MJ envoie la version complète (`full`, gardée pour lui, renvoyée dans `auth`)
  et la version publique (`pub` : PNJ visibles, santé en couleur, lieu affiché `bg`).

## Station → client

| `t` | Contenu |
|---|---|
| `state` | `now` (horloge de la station, ms), `chars`, `log`, `peers`, `combat` (version publique), `lieux`, `avatars` (`{id: v}`), `rv` (version des règles de la table) |
| `char` | `char` : fiche créée ou modifiée |
| `del` | `id` : fiche supprimée |
| `log` | `e` : jet de dés `{ts, who, label, f, faces, rolls, nat, total, keep, rq, secret}` |
| `peers` | `list` : appareils connectés `[{id, mj, dev, player, chars, since, screen}]` |
| `lieux` | `list` : lieux disponibles `[{id, n}]` |
| `avatar` | `id`, `v` : nouvelle version de la miniature (0 = retirée) |
| `combat` | `combat` : version publique du combat |
| `regles` | `v` : nouvelle version des règles de la table (voir plus bas) |
| `sys` | `sys` : `{up` (s), `temp` (°C, absent sans capteur), `heap {free, min, big, total}`, `fs {total, used}` (octets), `wifi {ch, rssi: [dBm]}`, `chip`, `cpu` (MHz), `flash` (octets), `idf`, `app`, `built`, `reset`, `tasks}` ; `peers` |
| `auth`, `created`, `claim`, `you` | réponses (voir plus haut) |
| `err` | `m` : message d'erreur à afficher |

## Règles de la table (HTTP)

L'appli lit ses règles au démarrage dans les documents Markdown de l'Espace Règles
(`GET /regles/<doc>.md`, docs : `regles`, `familles`, `profils`, `peuples`, `voies`, `prestige`, `equipement`).
Le MJ peut les remplacer, en HTTP et non en WebSocket, car un document dépasse la limite d'un message.
Côté station : [components/web_server/](../components/web_server/) ; côté appli :
[js/rules/load.js](../components/webapp/www/js/rules/load.js) et
[js/features/rules_admin.js](../components/webapp/www/js/features/rules_admin.js).

| Requête | Effet |
|---|---|
| `GET /regles/<doc>.md` | le document de la table s'il existe, sinon celui d'origine (embarqué dans le firmware) |
| `GET /regles/<doc>.md?origine` | toujours le document d'origine (repli si ceux de la table sont illisibles) |
| `GET /regles/index.json` | `{ "voies.md": 48236, … }` : documents de la table et leur taille compressée |
| `PUT /regles/<doc>.md` | en-tête `X-Pin` (code MJ), corps : le document compressé en gzip (256 Ko au plus) |
| `DELETE /regles/<doc>.md` | en-tête `X-Pin` : revient au document d'origine |

- Seuls les noms de documents embarqués sont acceptés. Erreurs : 403 (code MJ), 404 (document inconnu),
  413 (trop gros), 507 (pas assez de place : 96 Ko restent réservés à la partie et aux miniatures).
- L'écriture se fait dans un fichier temporaire, renommé à la fin : un envoi interrompu ne laisse rien.
- Après un `PUT` ou un `DELETE`, la station diffuse `regles {v}` et chaque appareil recharge l'appli.
  L'en-tête `X-Suite` (envoi de plusieurs documents) retarde cette diffusion jusqu'au dernier document.
  `v` est aussi dans `state` (`rv`) : un appareil hors ligne pendant l'envoi recharge à sa reconnexion.
  Il est tiré au hasard au démarrage de la station, si bien qu'un redémarrage déclenche aussi un rechargement.

## Persistance

L'état est sauvegardé dans `/data/party.json` (SPIFFS), quelques secondes après chaque modification :

```json
{ "next": 1, "chars": [], "tokens": { "c1": "ABC123" }, "log": [], "combat": {}, "combat_pub": {}, "lieux": [],
  "avatars": { "c1": 3 }, "avnext": 4 }
```

Les fiches sont du JSON libre : c'est l'appli web qui définit leur contenu.
Les miniatures sont des fichiers à part (`/data/av/<id>.jpg`) ; `avnext` donne la prochaine version.
Les documents de règles de la table sont dans `/data/regles/<doc>.md.gz`.

## Limites

Définies dans [components/game/game_priv.h](../components/game/game_priv.h) :
12 personnages, 6 Ko par fiche, 60 jets dans le journal, 6 Ko par version du combat,
40 lieux, 16 Ko par miniature (192 Ko au plus en flash), 80 Ko par message reçu.
Documents de règles de la table : 256 Ko compressés par document
([components/web_server/web_server.c](../components/web_server/web_server.c)).
