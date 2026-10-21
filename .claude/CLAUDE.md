# JDR Station — contexte pour Claude

Station de JDR autonome pour **Chroniques Oubliées Fantasy 2e éd.** sur **ESP32-C6** (ESP-IDF 6.1) :
point d'accès Wi-Fi + portail captif, appli web embarquée, synchro temps réel par WebSocket.
Rôles par appareil : joueur, MJ (PIN), écran partagé. Tout le projet (code, commentaires, docs, UI,
messages de commit) est **en français**.

Docs de référence (à lire seulement si le sujet l'exige) :
- [README.md](../README.md) : compilation, architecture détaillée, limites.
- [docs/protocol.md](../docs/protocol.md) : tous les messages WebSocket, droits, persistance, limites.
- [docs/manual.md](../docs/manual.md) : manuel utilisateur (joueurs, MJ, écran partagé).
- [references/COFv2/README.md](../references/COFv2/README.md) : format des documents de règles.

## Carte du code

```
main/main.c            lit menuconfig (Kconfig.projbuild), relie les composants
components/
  network/             AP Wi-Fi + DNS captif
  store/               état de la partie (cJSON) + /data/party.json (SPIFFS) — store_root(), store_mark_dirty()
  sysinfo/             température, mémoire, flash, Wi-Fi (message sys, MJ)
  game/                protocole : game.c = table HANDLERS { "type", fn } ; un fichier par domaine
                       (characters, dice, peers, combat, lieux, avatar, party = droits, messages = msg_*)
                       game_priv.h : limites MAX_* et API interne
  web_server/          HTTP + WS /ws, /av/<id>.jpg, /regles/ ; ne connaît pas game (callbacks)
  webapp/www/          appli web sans dépendance (HTML/CSS/JS vanilla)
    js/core/           util, DOM ($, $$), storage (load/save localStorage préfixé jdr.)
    js/rules/          lecture des .md de règles, tables, calc() de la fiche, normalisation, dés
    js/features/       combat (MJ), images (lieux, IndexedDB), avatars, screen (écran partagé), rules_admin
    js/ui/             render.js (routage #/… + render/update), actions.js (ACTIONS), events.js, widgets,
                       views/ : un fichier par écran (mj.js, sheet.js, global.js, config.js…)
    js/state.js        objet global S ; net.js (connect, send, change/queue = patch) ; messages.js (onMsg)
  webapp/bundles.json  fichiers servis + ordre de concaténation (portée JS unique, main.js en dernier)
  webapp/gen_assets.py concatène + gzip → tableau C à la compilation
references/COFv2/      règles en Markdown = données de jeu (aucune donnée de jeu codée en dur)
tools/drs/             md2drs.py (.md → drs.json), gen_refs.py
```

## Conventions

- **Appli web** : un seul `app.js` concaténé, pas de modules ni d'imports ; tout fichier ajouté dans
  `www/` doit être déclaré dans `bundles.json` (sinon la compilation échoue), et l'ordre compte.
- **Boutons** : `<button data-a="nom" data-v="…">` → `ACTIONS['nom'](el, perso)` dans
  [ui/actions.js](../components/webapp/www/js/ui/actions.js). Le perso vient du `[data-id]` parent.
- **Rendu** : vues = fonctions qui renvoient du HTML en template string, `esc()` pour toute donnée.
  `update()` (préserve une saisie en cours) plutôt que `render()` après un message de la station.
- **Envoi** : `send({ t: 'type', … })` renvoie faux si hors ligne ; droits via `authFor(id)` ou `pin: S.pin`.
  Fiches modifiées champ par champ : `change(c, 'chemin.x', valeur)` (message `patch`).
- **Firmware** : un gestionnaire `xxx_on_yyy(const cJSON *m, int fd, game_out_t *out)` appelé sous
  `store_lock()` ; il remplit `out->reply` (expéditeur) et/ou `out->broadcast` (tous). Vérifier le MJ
  avec `party_is_mj(m)`, renvoyer `msg_err("…")` en cas de refus. Nouveau type : ligne dans `HANDLERS`
  ([game.c](../components/game/game.c)) + déclaration dans `game_priv.h`.
- **Style** : `.editorconfig` (C/Python 4 espaces, JS/CSS/HTML/JSON 2 espaces, LF). Commentaires courts,
  en français, en tête de fichier et de fonction. Textes UI avec apostrophe typographique `’`.
- **Docs à tenir à jour** avec une fonctionnalité : `docs/manual.md` (usage), `docs/protocol.md`
  (nouveau message / champ), `README.md` (architecture, limites).
- Commits : préfixes `feat:`, `fix:`, `refactor:`, `doc:`, message en français.

## Vérifier sans flasher

```powershell
python -I components/webapp/gen_assets.py --dist build/www   # assemble l'appli (détecte un fichier non déclaré)
node --check build/www/app.js                                # syntaxe JS, si Node est installé
python -I tools/drs/md2drs.py                                # après modification des .md de règles
python -I tools/drs/gen_refs.py --check
```

Compilation complète : `idf.py build` dans un terminal ESP-IDF (voir README) ; cible `esp32c6`.

## Points d'attention

- Ressources ESP : 1 Mo de SPIFFS, 8 appareils, fiche ≤ 6 Ko, 40 lieux, miniatures 16 Ko — voir
  `MAX_*` dans `game_priv.h` et la section Limites de `docs/protocol.md`.
- Les images de lieux restent dans le navigateur de l'écran (IndexedDB) ; la station ne garde que la
  liste `{id, n}` (message `lieux`, remplace la liste) et le MJ choisit `bg` dans le combat public.
- La lecture des règles existe en JS (`rules/parse.js`) et en Python (`tools/drs/md2drs.py`) : à garder
  synchronisées.
