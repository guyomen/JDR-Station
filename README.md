# JDR Station — ESP32-C6

Une station de jeu de rôle autonome pour **Chroniques Oubliées Fantasy (2e édition)**.
L'ESP32-C6 crée son propre réseau Wi-Fi : les joueurs s'y connectent avec leur téléphone,
remplissent leur fiche de personnage, lancent les dés, et le MJ suit tout le groupe en direct.
Aucune connexion Internet n'est nécessaire.

## Disclaimer 

Toutes les informations relative a Chroniques oubliées ont été copier a partir de https://drs.chroniques-oubliees.fr en acces libre.

**IL EST NECESSAIRE TOUTE FOIS D'AVOIR LE LIVRE OFFICIEL POUR LES REGLES ET AUTRES, IL NE S'AGIT QUE D'UN OUTIL D'AIDE PAS UN SUBSTITUE A LA LECTURE**

## Fonctionnalités

**Joueurs** (téléphone)
- Création de personnage puis fiche en onglets : *Perso*, *Combat*, *Voies*, *Sac*, *Notes*, *Dés*.
- Tout se choisit dans des listes issues des règles : peuple, profil, niveau, armure, bouclier,
  armes (DM, portée, critique), les 132 voies du DRS officiel (78 de profil/peuple, 54 de prestige)
  avec le texte complet de chaque capacité (ⓘ), sorts ✦ et type d'action, idéal et travers, états.
- Valeurs calculées selon les règles COF2 : PV, DR (nombre et type de dé), PC, PM, DEF
  (avec plafond d'AGI de l'armure), initiative, attaques, DM des armes. Les bonus permanents
  des capacités acquises s'appliquent automatiquement.
- Jets en un clic : test de caractéristique, attaque, dégâts, dé bonus / dé malus.
- Code de reprise (6 caractères) pour retrouver son personnage sur un autre téléphone.

**MJ** (code PIN)
- Tableau de bord du groupe : PV / DR / PC / PM avec boutons ±1 / ±5, DEF, attaques,
  états, armes, voies — mis à jour en temps réel.
- Ouverture et modification de n'importe quelle fiche.
- Ordre d'initiative (PJ + PNJ ajoutés à la volée), compteur de tours.
- Journal de tous les jets, jets secrets, distribution d'XP, récupération complète du groupe.
- Export / import JSON pour sauvegarder la campagne.

**Station**
- Point d'accès Wi-Fi + portail captif : l'appli s'ouvre automatiquement à la connexion.
- Synchronisation instantanée par WebSocket, dés tirés par le générateur aléatoire matériel de l'ESP.
- Sauvegarde automatique en flash (SPIFFS) : rien n'est perdu au redémarrage.

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

> La table de partitions vise une flash de 4 Mo (app 1,5 Mo + données 1 Mo).

## Utilisation

1. Alimentez l'ESP32-C6.
2. Sur chaque téléphone, rejoignez le Wi-Fi **JDR-Station** (mot de passe `chroniques`).
3. L'appli s'ouvre toute seule ; sinon, allez sur **http://192.168.4.1**.
4. Joueurs : « Créer » un personnage. MJ : « Espace MJ » puis le code PIN.

Conseils :
- Si le téléphone affiche « Pas d'accès Internet », choisissez **Rester connecté**.
- La fenêtre de portail captif d'iOS/Android est limitée (elle oublie vos personnages).
  Pour jouer, ouvrez plutôt **http://192.168.4.1** dans le vrai navigateur, ou ajoutez-le
  à l'écran d'accueil.
- Notez le **code de reprise** de votre personnage (onglet Perso).

## Règles et personnalisation

Le résumé des règles et la référence complète (profils, voies, prestige, JSON) sont dans [references/COFv2/](references/COFv2/README.md). Les données de jeu (profils, peuples, voies,
armes, armures, états…) sont dans [cof2.js](components/webapp/www/js/data/cof2.js) et les calculs dans la
fonction `calc()` de [rules/character.js](components/webapp/www/js/rules/character.js) :

```
PV  = (niveau + 1) × PV de famille + niveau × CON     (aventurier/mystique 4, combattant 5, mage 3)
DR  = 2 + CON (+1 mystique), dé d8 / d10 / d6 / d8 selon la famille
PC  = 2 + CHA (+1 aventurier)
PM  = VOL + nombre de sorts connus (0 sans sort)
Init = 10 + PER          DEF = 10 + AGI (plafonnée par l'armure) + armure + bouclier
Attaques = niveau (max. 10) + FOR / AGI / VOL     DM contact = dé + FOR, distance = dé
```

Les capacités acquises ajoutent leurs bonus permanents (champ `fx` de chaque voie dans `cof2.js`).
Les bonus conditionnels (sans armure, avec bouclier, objet magique…) se saisissent dans
« Bonus divers ». Les caractéristiques saisies sont les valeurs de base ; les bonus de
capacité (« Force héroïque »…) s'affichent en vert et s'ajoutent automatiquement.

Les fiches créées avec l'ancienne version sont converties à l'ouverture (peuple, profil,
armure et voies reconnus par leur nom ; les « PR » sont remplacés par les DR).

## Architecture

```
main/                 démarrage : lit la configuration (menuconfig) et relie les composants
components/
  network/            point d'accès Wi-Fi + DNS de portail captif (tout nom → 192.168.4.1)
  store/              état de la partie + sauvegarde /data/party.json (SPIFFS)
  game/               protocole : aiguillage (game.c), fiches (characters.c), dés et journal (dice.c),
                      appareils connectés (peers.c), initiative (combat.c), droits (party.c)
  web_server/         HTTP + WebSocket /ws, redirection du portail captif (ne connaît pas game)
  webapp/             appli web embarquée (HTML/CSS/JS, sans dépendance externe)
    www/index.html
    www/css/          un fichier par écran
    www/js/
      core/           utilitaires, DOM, stockage local
      data/           cof2_drs.js (DRS, généré) et cof2.js (familles, bonus des capacités, équipement…)
      rules/          règles COF2 : tables, calculs de la fiche, conversion des anciennes fiches, dés
      features/       initiative du MJ, images de lieux, mode écran partagé
      ui/             rendu, composants, actions ; ui/views/ : un fichier par écran
      state.js, net.js, messages.js, main.js
    bundles.json      fichiers servis et ordre de concaténation des sources
    gen_assets.py     assemblage + gzip + tableau C (lancé à la compilation)
docs/protocol.md      messages WebSocket, droits, persistance, limites
references/COFv2/     règles et référence complète en Markdown + drs.json (voir son README)
tools/drs/            extraction du DRS et génération des références / données de l'appli
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

Les fiches sont du JSON libre côté firmware : on peut enrichir la fiche ou les données de jeu dans
l'appli web sans toucher au C. Les modifications sont envoyées champ par champ (« patch »), ce qui évite
qu'un joueur et le MJ s'écrasent mutuellement. Détails : [docs/protocol.md](docs/protocol.md).

Droits : chaque personnage a un code secret, connu du téléphone qui l'a créé.
Le PIN du MJ donne tous les droits. C'est une protection « entre amis » : le réseau est local
et le trafic n'est pas chiffré.

Limites : 12 personnages, ~6 Ko par fiche, 8 téléphones (10 max. pour le Wi-Fi de l'ESP32).
