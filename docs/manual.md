# JDR Station — manuel d'utilisation

JDR Station est une petite boîte qui crée son propre réseau Wi-Fi autour de la table.
Chacun s'y connecte avec son téléphone : les joueurs remplissent leur fiche de
**Chroniques Oubliées Fantasy (2e édition)** et lancent les dés, le meneur de jeu suit tout le
groupe en direct, et une tablette posée au centre de la table peut afficher l'état du groupe
pour tous. Aucune connexion Internet n'est nécessaire.

> Les textes de règles viennent du DRS en accès libre (https://drs.chroniques-oubliees.fr).
> **Le livre officiel reste nécessaire** : la station est une aide de jeu, pas un substitut à sa lecture.

## Sommaire

- [Se connecter](#se-connecter)
- [Première connexion : qui utilise l'appareil ?](#première-connexion--qui-utilise-lappareil-)
- [Joueurs](#joueurs)
- [Meneur de jeu](#meneur-de-jeu)
- [Écran partagé et lieux](#écran-partagé-et-lieux)
- [Espace global](#espace-global)
- [Espace Règles](#espace-règles)
- [Comment la fiche est calculée](#comment-la-fiche-est-calculée)
- [Problèmes fréquents](#problèmes-fréquents)

## Se connecter

1. Branchez la station.
2. Sur chaque téléphone, rejoignez le Wi-Fi **JDR-Station** (mot de passe `chroniques`).
3. L'appli s'ouvre toute seule. Sinon, allez sur **http://192.168.4.1** dans le navigateur.

> Le nom du réseau, le mot de passe et le code du MJ peuvent avoir été changés par la personne
> qui a préparé la station : demandez-les-lui.

## Première connexion : qui utilise l'appareil ?

À la première connexion, l'appli demande qui utilise l'appareil :

| Choix | Pour qui | L'appareil s'ouvre ensuite sur |
|---|---|---|
| 🧝 Joueur / joueuse | chaque joueur, avec son nom | l'Espace joueur |
| 🎲 Meneur de jeu | le MJ, avec son nom et le code MJ | l'Espace MJ |
| 📺 Écran partagé | une tablette ou un écran posé au centre de la table | l'espace global en plein écran |

Ce choix est retenu par le navigateur. Pour le modifier, ouvrez **⚙ Réglages de cet appareil** :
vous pouvez y renommer l'utilisateur, changer de profil, ou **changer d'utilisateur**. Dans ce
dernier cas, l'appareil oublie ses personnages ; on les retrouve avec leur code de reprise.

## Joueurs

### Créer son personnage

Dans l'**Espace joueur**, donnez un nom au personnage, choisissez son peuple et son profil, puis
appuyez sur **Créer**. Votre nom de joueur est repris automatiquement sur la fiche.

### L'image du personnage

En haut de l'onglet *Perso*, **📷 Choisir une image** : prenez une photo ou choisissez une image.
Elle est recadrée en carré (centrée, un peu vers le haut pour un portrait) et réduite en miniature,
qui s'affiche sur l'écran partagé, dans l'ordre d'initiative et chez le MJ. L'image d'origine reste
sur votre téléphone ; seule la miniature est envoyée à la station. **Retirer** l'enlève.
Le MJ peut aussi changer ou retirer l'image d'un personnage.

### La fiche

La fiche est découpée en onglets :

| Onglet | Contenu |
|---|---|
| *Perso* | image, identité, peuple, profil, niveau, caractéristiques, idéal et travers, **code de reprise** |
| *Combat* | PV, DR, PC, PM, DEF, initiative, armure, bouclier, armes, états |
| *Voies* | voies de profil, de peuple et de prestige, rangs acquis |
| *Sac* | équipement |
| *Notes* | notes libres |
| *Dés* | lanceur de dés libre (ex. `2d6+3`, `1d20+FOR`) |

Presque tout se choisit dans des listes issues des règles : armures, armes (DM, portée, critique),
les 132 voies du DRS avec le texte de chaque capacité (bouton ⓘ), sorts (✦), états…

### Lancer les dés

Un appui suffit pour un test de caractéristique, une attaque ou des dégâts. Le **dé bonus** et le
**dé malus** lancent deux d20 et gardent le meilleur ou le pire. Les dés sont tirés par la station
et tous les jets apparaissent dans le journal du MJ.

### Retrouver son personnage sur un autre téléphone

Notez le **code de reprise** (6 caractères, onglet *Perso*). Sur le nouveau téléphone, ouvrez
votre personnage dans « Autres personnages » de l'Espace joueur et saisissez ce code.

## Meneur de jeu

L'Espace MJ demande le code MJ (par défaut `1234`). Il a quatre onglets.

**Groupe** — tous les personnages en direct : PV / DR / PC / PM avec boutons ±1 / ±5, DEF,
attaques, états, armes, voies. Le MJ peut ouvrir et modifier n'importe quelle fiche.

**Initiative** — ordre d'initiative des PJ et des PNJ, compteur de tours, bouton **Suivant ▶** (↺ revient au tour 1).
- Ajoutez les PNJ et monstres à la volée (nom, initiative, PV, nombre d'exemplaires numérotés).
- 👁 rend un PNJ visible dans l'espace global : les joueurs voient son initiative, ses états et
  sa santé en couleur (vert, jaune sous 2/3 des PV, rouge sous 1/3, noir = mort quand
  le MJ passe ses PV en négatif), jamais ses PV. Un mort reste dans l'initiative.

**Dés** — journal de tous les jets, et jets secrets que vous seul voyez.

**Outils**
- **Lieu affiché sur l'écran partagé** : choisissez un lieu dans la liste, ou « Aucun ».
  La liste vient de l'écran partagé (voir ci-dessous) et reste disponible même quand
  l'écran est éteint.
- **Repos** : récupération complète du groupe (+1 DR, tous les PM).
- **Sauvegarde** : export de la campagne en fichier JSON, et import (qui remplace tous les
  personnages de la station). Les images des personnages ne sont pas dans l'export : après un
  import, chacun remet la sienne.
- **Station** : température de la puce, stockage restant (la partie et les images des
  personnages), mémoire vive, Wi-Fi (canal, appareils et force du signal), durée de
  fonctionnement et cause du dernier démarrage, version du logiciel. Actualisé toutes les 5 s.
  Une jauge passe au rouge au-delà de 85 %, la température au-delà de 70 °C.
- Vider le journal des dés, quitter le mode MJ.

## Écran partagé et lieux

L'écran partagé affiche l'espace global en plein écran pour toute la table et reste allumé.
Le lieu choisi par le MJ s'affiche en fond.

### Charger les lieux

Les images de lieux se chargent **sur l'appareil de l'écran partagé lui-même**, car ce sont
ses images qui sont affichées :

1. Sur l'écran, quittez le plein écran avec **✕** : vous arrivez sur l'espace global.
2. Dans la carte **🖼 Lieux**, choisissez **📁 le dossier d'images**, ou ajoutez des fichiers un par un.
3. La liste des lieux est envoyée à la station : le MJ la voit aussitôt dans *Outils*.
4. Repassez en mode écran avec **📺 Mode écran**.

Le nom du fichier donne le nom du lieu : « Ville du port.jpg » devient *Ville du port*.

Sous chaque miniature, choisissez le cadrage de l'image sur l'écran :

| Cadrage | Effet |
|---|---|
| Plein écran | l'image remplit tout l'écran, quitte à être rognée (par défaut) |
| Ajusté en hauteur | toute la hauteur de l'image est visible, bandes sur les côtés si besoin |
| Ajusté en largeur | toute la largeur de l'image est visible, bandes en haut et en bas si besoin |

Le bouton ⬛ / ⬜ à côté choisit la couleur du fond, **noir** (par défaut) ou **blanc** : elle remplit
les bandes d'un cadrage ajusté et apparaît à travers les parties transparentes d'une image
(PNG détouré, carte sur fond transparent…).

Cadrage et fond sont retenus pour chaque lieu par l'appareil de l'écran.

Bon à savoir :
- Les images sont copiées dans le navigateur de l'écran, jamais sur la station. Si vous modifiez
  le dossier sur l'ordinateur ou la tablette, appuyez sur **Resynchroniser le dossier**.
- Choisir un dossier remplace toute la bibliothèque : les images retirées du dossier disparaissent.
- Supprimer une image (✕ sur sa miniature) la retire aussi de la liste du MJ.
- Si la carte indique « La station ne connaît pas encore ces lieux » (par exemple après une mise à
  jour de la station), appuyez sur **📡 Annoncer ces lieux**.
- Si le MJ choisit un lieu que l'écran n'a pas, un petit avertissement apparaît en bas de l'écran.

## Espace global

Accessible à tous depuis l'accueil :
- qui est connecté (nom, appareil, depuis quand) ;
- personnages actifs avec leurs PV / PM et leurs états, personnages hors ligne ;
- ordre d'initiative public : tour en cours et PNJ rendus visibles par le MJ ;
- la carte **🖼 Lieux** (voir plus haut).

## Espace Règles

Accessible à tous depuis l'accueil ou le bouton **📖** en haut de l'écran, même sans avoir choisi
d'utilisateur. Sept documents, un par onglet :
- **Aide-mémoire** : création, progression, tests, combat, magie, aventure ;
- **Familles** et **Profils** : PV, DR, PC, armes et armures, équipement de départ, voies de chaque profil ;
- **Peuples** : caractéristiques, repères, noms, voie de peuple ;
- **Voies** et **Prestige** : texte complet de chaque capacité ;
- **Équipement** : monnaie, matériel, montures, armes, armures et boucliers, avec leurs prix.

Les liens des sommaires et les renvois d'un document à l'autre (par exemple d'un profil vers ses
voies) mènent directement au bon passage.

## Comment la fiche est calculée

Les valeurs suivent les règles de COF2 :

```
PV  = (niveau + 1) × PV de famille + niveau × CON     (aventurier/mystique 4, combattant 5, mage 3)
DR  = 2 + CON (+1 mystique), dé d8 / d10 / d6 / d8 selon la famille
PC  = 2 + CHA (+1 aventurier)
PM  = VOL + nombre de sorts connus (0 sans sort)
Init = 10 + PER          DEF = 10 + AGI (plafonnée par l'armure) + armure + bouclier
Attaques = niveau (max. 10) + FOR / AGI / VOL     DM contact = dé + FOR, distance = dé
```

- Saisissez les caractéristiques **de base** : les bonus des capacités acquises (« Force
  héroïque »…) s'ajoutent automatiquement et s'affichent en vert.
- Les bonus conditionnels (sans armure, avec bouclier, objet magique…) se saisissent dans
  « Bonus divers ».
- Les fiches de l'ancienne version sont converties à l'ouverture (les « PR » deviennent des DR).

## Problèmes fréquents

| Problème | Solution |
|---|---|
| Le téléphone affiche « Pas d'accès Internet » | Choisissez **Rester connecté** : c'est normal, la station n'a pas Internet. |
| Mes personnages ont disparu après la connexion | La fenêtre de connexion automatique d'iOS / Android oublie tout. Ouvrez **http://192.168.4.1** dans le vrai navigateur, ou ajoutez-le à l'écran d'accueil. |
| J'ai changé de téléphone | Reprenez votre personnage avec son code de reprise. |
| Tout est oublié sur un appareil | La navigation privée ou l'effacement des données du site effacent le profil, les personnages et les images de l'appareil. Les fiches restent sur la station. |
| L'écran affiche « Lieu absent de cet écran » | L'image n'est pas sur cet appareil : touchez l'avertissement et rechargez le dossier d'images. |
| « Code MJ incorrect » | Demandez le code à la personne qui a préparé la station (par défaut `1234`). |

La station sauvegarde la partie automatiquement : rien n'est perdu quand on la débranche.
Elle accueille jusqu'à 12 personnages et 8 appareils connectés.
