# JDR Station — ESP32-C6

Une station de jeu de rôle autonome pour **Chroniques Oubliées Fantasy (2e édition)**.
L'ESP32-C6 crée son propre réseau Wi-Fi et sert une appli web : les joueurs y remplissent leur fiche
et lancent les dés depuis leur téléphone, le MJ suit tout le groupe en direct, et un écran partagé
affiche l'état du groupe et le lieu en cours. Aucune connexion Internet n'est nécessaire.

**Joueurs et MJ : voir le [manuel d'utilisation](docs/manual.md).**
Ce README s'adresse à ceux qui compilent, flashent ou modifient la station.

## Disclaimer

Toutes les informations relatives à Chroniques Oubliées ont été copiées à partir de
https://drs.chroniques-oubliees.fr, en accès libre.

**Il est nécessaire toutefois d'avoir le livre officiel pour les règles : il ne s'agit que d'un outil
d'aide, pas d'un substitut à sa lecture.**

## Fonctionnalités

- **Un appareil = un utilisateur** : joueur, MJ (code PIN) ou écran partagé, profil retenu par le navigateur.
- **Joueurs** : fiche COF2 complète (132 voies du DRS, équipement, états), valeurs calculées selon les
  règles, jets en un clic, image du personnage (miniature), code de reprise pour changer de téléphone.
- **MJ** : tableau de bord du groupe en temps réel, toutes les fiches, initiative avec PNJ visibles
  ou masqués, journal des jets et jets secrets, repos, export / import JSON,
  état de la station (température, stockage, mémoire, Wi-Fi), **règles de la table** : télécharger,
  modifier et renvoyer les documents de règles (voies, bonus, profils, armes…) sans recompiler.
- **Écran partagé** : espace global en plein écran, initiative publique, lieu choisi par le MJ en fond.
  Les images de lieux restent dans le navigateur de l'écran ; seule leur liste est envoyée à la station.
- **Espace Règles** : pour tous, consultation des documents de [references/COFv2/](references/COFv2/README.md)
  (aide-mémoire, familles, profils, peuples, voies, voies de prestige, équipement), avec les liens entre documents.
- **Station** : point d'accès Wi-Fi + portail captif, synchronisation par WebSocket, dés tirés par le
  générateur aléatoire matériel, sauvegarde automatique en flash (SPIFFS).

Le détail de chaque écran est dans le [manuel](docs/manual.md).

## Compilation et flash

Prérequis : ESP-IDF v5.4 (déjà installé dans `C:\Users\gga\esp\v5.4\esp-idf`).

```powershell
. C:\Users\gga\esp\v5.4\esp-idf\export.ps1
cd <dossier du projet>
idf.py set-target esp32c6     # une seule fois
idf.py menuconfig             # optionnel : menu « JDR Station »
idf.py -p COM5 flash monitor  # adaptez le port COM
```

Réglages du menu **JDR Station** (`idf.py menuconfig`) :

| Option | Défaut |
|---|---|
| Nom du réseau Wi-Fi | `JDR-Station` |
| Mot de passe Wi-Fi (vide = ouvert) | `chroniques` |
| Canal Wi-Fi | 6 |
| Appareils max. | 8 |
| Code PIN du MJ | `1234` |

> La table de partitions vise une flash de 4 Mo (app 1,5 Mo + données 1 Mo). L'appli web et les
> documents de règles occupent environ 180 Ko de l'app, compressés en gzip.

Une fois flashée, la station répond sur **http://192.168.4.1** depuis son réseau Wi-Fi.
Si vous changez les valeurs par défaut, pensez à les donner aux joueurs : le manuel cite celles-ci.

## Règles et données de jeu

**Aucune donnée de jeu n'est codée dans l'appli** : tout vient des documents Markdown de
[references/COFv2/](references/COFv2/README.md) (aide-mémoire, familles, profils, peuples, voies, prestige,
équipement), embarqués dans le firmware et affichés dans l'Espace Règles. Au démarrage, l'appli les
télécharge et les lit : voies et capacités, bonus permanents (lignes **Bonus**), variantes, profils (PV, DR,
PC, voies), peuples, armes, armures, états, niveaux requis… Le format des balises est décrit dans le
[README des références](references/COFv2/README.md#balises-lues-par-la-fiche).

Le MJ peut remplacer ces documents depuis l'appli (Outils › *Règles de la table*) sans recompiler : voies
modifiées ou ajoutées, nouvelles armes, bonus corrigés… La station les garde en flash
(`/data/regles/`), les documents d'origine restent dans le firmware.

- lecture des documents : [rules/parse.js](components/webapp/www/js/rules/parse.js), même lecture en
  Python dans [tools/drs/md2drs.py](tools/drs/md2drs.py) (`.md` → `drs.json`) : à garder synchronisés ;
- tables de jeu et bonus : [rules/tables.js](components/webapp/www/js/rules/tables.js) ; chargement, repli
  sur les documents d'origine s'ils sont illisibles : [rules/load.js](components/webapp/www/js/rules/load.js) ;
- calculs de la fiche : fonction `calc()` de [rules/character.js](components/webapp/www/js/rules/character.js)
  (formules rappelées dans le [manuel](docs/manual.md#comment-la-fiche-est-calculée)) ;
- envoi des documents par le MJ : [features/rules_admin.js](components/webapp/www/js/features/rules_admin.js) ;
- conversion des fiches de l'ancienne version (peuple, profil, armure et voies reconnus par leur nom,
  « PR » remplacés par les DR) : [rules/normalize.js](components/webapp/www/js/rules/normalize.js).

Après une modification des `.md` dans le dépôt :

```powershell
python -I tools/drs/md2drs.py            # met à jour drs.json, signale liens et voies inconnus
python -I tools/drs/gen_refs.py --check  # vérifie que la lecture ne perd rien
```

## Architecture

```
main/                 démarrage : lit la configuration (menuconfig) et relie les composants
components/
  network/            point d'accès Wi-Fi + DNS de portail captif (tout nom → 192.168.4.1)
  store/              état de la partie + sauvegarde /data/party.json (SPIFFS)
  sysinfo/            état de la station pour le MJ : température, mémoire, flash, Wi-Fi
  game/               protocole : aiguillage (game.c), fiches (characters.c), dés et journal (dice.c),
                      appareils connectés (peers.c), initiative (combat.c), lieux (lieux.c),
                      miniatures (avatar.c), droits (party.c)
  web_server/         HTTP + WebSocket /ws, fichiers /av/, règles de la table /regles/ (lecture, envoi
                      du MJ), redirection du portail captif (ne connaît pas game)
  webapp/             appli web embarquée (HTML/CSS/JS, sans dépendance externe)
    www/index.html
    www/css/          un fichier par écran
    www/js/
      core/           utilitaires, DOM, stockage local
      rules/          lecture des documents de règles, tables de jeu, calculs de la fiche, conversion
                      des anciennes fiches, dés, chargement au démarrage
      features/       initiative du MJ, images de lieux, miniatures des personnages, mode écran partagé,
                      règles de la table (MJ)
      ui/             rendu, composants, actions ; ui/views/ : un fichier par écran
                      (regles.js : Espace Règles et son rendu Markdown)
      state.js, net.js, messages.js, main.js
    bundles.json      fichiers servis (dont regles/*.md) et ordre de concaténation des sources
    gen_assets.py     assemblage + gzip + tableau C (lancé à la compilation)
docs/manual.md        manuel d'utilisation (joueurs, MJ, écran partagé)
docs/protocol.md      messages WebSocket, droits, persistance, limites
references/COFv2/     règles en Markdown : données de jeu de l'appli et Espace Règles (voir son README)
tools/drs/            md2drs.py (.md → drs.json), gen_refs.py (format canonique), import initial du DRS
```

**Firmware.** Chaque composant expose une API minimale dans son dossier `include/` et déclare ses
dépendances dans son `CMakeLists.txt`. Seul `main` lit la configuration et connaît tout le monde :
`web_server` transmet les messages WebSocket à `game` par des fonctions de rappel.

**Appli web.** Les sources sont découpées par responsabilité, mais la station ne sert que trois fichiers
(`index.html`, `app.css`, `app.js`) : à la compilation, `gen_assets.py` les concatène dans l'ordre de
`bundles.json` et les compresse en gzip. Peu de requêtes par téléphone, donc peu de sockets ouvertes sur
l'ESP. Les scripts partagent une seule portée : l'ordre de `bundles.json` compte pour le code exécuté
au chargement (données, puis règles, puis interface, `main.js` en dernier). Un fichier ajouté à `www/`
doit être déclaré dans `bundles.json`, sinon la compilation s'arrête. Pour voir le résultat sans compiler :

```powershell
python -I components/webapp/gen_assets.py --dist build/www
```

**Règles et Espace Règles.** Les documents de `references/COFv2/` sont servis à part, sur
`/regles/<doc>.md` (chemins `../` dans `bundles.json`). L'appli les télécharge tous au démarrage, avant
de se connecter : les fiches reçues de la station sont lues avec ces règles. L'Espace Règles les affiche
avec son propre rendu Markdown (titres, listes, tableaux, citations, liens) et transforme les liens entre
documents (`voies.md#rage`) en routes `#/regles/voies/rage`. Pour ajouter un document : une ligne dans
`bundles.json` et une entrée dans `RULES_DOCS` ([rules/load.js](components/webapp/www/js/rules/load.js)).
Requêtes HTTP des règles de la table : [docs/protocol.md](docs/protocol.md#règles-de-la-table-http).

Les fiches sont du JSON libre côté firmware : on peut enrichir la fiche ou les données de jeu dans
l'appli web sans toucher au C. Les modifications sont envoyées champ par champ (« patch »), ce qui évite
qu'un joueur et le MJ s'écrasent mutuellement. Détails : [docs/protocol.md](docs/protocol.md).

**Lieux de l'écran partagé.** Les images ne passent jamais par la station (1 Mo de SPIFFS) : l'écran les
garde dans IndexedDB et annonce leur liste `{id, n}` par le message `lieux`. La station la persiste dans
`party.json` et la diffuse ; le MJ choisit un `id` parmi elle (champ `bg` du combat public).

**Miniatures des personnages.** L'appli recadre l'image en carré de 192 px et la compresse en JPEG
(≤ 15 Ko) avant l'envoi par le message `avatar`. La station l'écrit dans un fichier à part
(`/data/av/<id>.jpg`, pas dans la fiche limitée à 6 Ko) et la sert sur `/av/<id>.jpg?v=<version>`,
avec un cache d'un an côté navigateur : 12 personnages × 16 Ko au plus, soit 192 Ko de la SPIFFS de 1 Mo.

**Droits.** Chaque personnage a un code secret, connu de l'appareil qui l'a créé (ou repris avec ce code).
Le PIN du MJ donne tous les droits. Le profil et le nom de l'utilisateur restent dans le navigateur
de l'appareil ; la station ne reçoit le nom que pour la liste des connectés. C'est une protection
« entre amis » : le réseau est local et le trafic n'est pas chiffré.

**Limites.** 12 personnages, ~6 Ko par fiche, 16 Ko par miniature, 40 lieux, 8 téléphones (10 max. pour le Wi-Fi de l'ESP32).
Valeurs exactes dans [docs/protocol.md](docs/protocol.md#limites).
