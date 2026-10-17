# Références — Chroniques Oubliées Fantasy 2e édition

Les règles utilisées par JDR Station. **Ces fichiers Markdown sont la référence** : l'appli les lit au
démarrage pour construire la fiche (voies, bonus des capacités, profils, peuples, armes, armures, états…)
et les affiche dans l'**Espace Règles**. Les modifier change donc les règles de la table.

| Fichier | Contenu | Lu par la fiche | Source |
|---|---|---|---|
| [regles.md](regles.md) | Aide-mémoire : création, progression, tests, combat, magie, aventure | états, séries de caractéristiques, niveaux requis par rang, idéaux et travers | Livre (PDF) |
| [equipement.md](equipement.md) | Monnaie, matériel, montures, auberge, armes, armures et boucliers, qualité, exotique | armes, armures, boucliers | Livre (PDF) |
| [familles.md](familles.md) | Les familles de profils : particularités, voies de profil et de prestige | particularité, rang 2 au niveau 1, voie remplaçant la voie de peuple | DRS |
| [profils.md](profils.md) | Les profils : description, PV, DR, PC, armes et armures, équipement, voies | tout | DRS |
| [peuples.md](peuples.md) | Les peuples et la voie du mage : caractéristiques, repères, noms, voie de peuple | nom, modificateurs, voies de peuple | DRS |
| [voies.md](voies.md) | Les voies de profil et de peuple (5 capacités chacune) | tout, bonus et variantes compris | DRS |
| [prestige.md](prestige.md) | Les voies de prestige (rangs 4 à 8) | tout | DRS |
| [drs.json](drs.json) | Les mêmes données, structurées : généré depuis les `.md` par `md2drs.py` | — | — |

DRS = [Document de référence du système](https://drs.chroniques-oubliees.fr/fantasy), la version web officielle
des règles publiée par Black Book Éditions. © Black Book Éditions : ces fichiers servent de référence
personnelle pour le projet ; ne pas les redistribuer.

## Deux façons de changer les règles

- **À la table, sans recompiler** : le MJ télécharge les documents depuis l'appli (Espace MJ › Outils ›
  *Règles de la table*), les modifie, puis les renvoie. L'appli les vérifie et affiche un rapport :
  voies ajoutées ou modifiées, bonus non reconnus… Après l'envoi, tous les appareils rechargent l'appli
  avec les nouvelles règles. La station les garde dans sa mémoire flash et les documents d'origine
  restent dans le firmware : un bouton permet d'y revenir.
- **Dans le dépôt** : modifier les fichiers ici, puis lancer `md2drs.py` (voir plus bas) et reflasher.
  Ce sont alors les règles d'origine de la station.

Le texte libre (descriptions, règles, tableaux sans balise) se modifie comme n'importe quel Markdown.
Seules les balises ci-dessous sont lues par la fiche.

## Balises lues par la fiche

Une ligne `<a id="identifiant"></a>` juste avant un titre donne son identifiant à ce qui suit. Un identifiant
est fait de minuscules, de chiffres et de tirets. Il sert aux liens (`voies.md#rage`) et aux fiches de
personnage : **ne changez pas celui d'un élément existant**, les personnages qui l'utilisent le perdraient.

### Familles (dans familles.md, profils.md, voies.md, prestige.md)

`<a id="famille-mage"></a>` avant un titre `## …` ouvre une section de famille. Dans **profils.md**, un profil
appartient à la famille de sa section ; dans **voies.md** et **prestige.md**, une voie aussi. La famille
`peuple` (voies de peuple) et les familles sans profil (`generique` : voies de prestige accessibles à tous)
existent aussi. Dans **familles.md**, chaque section peut porter :

```markdown
<a id="famille-mage"></a>
## Mages

**Particularité :** +1 capacité de rang 2 au niveau 1, voie du mage possible
**Rang 2 dès le niveau 1 :** oui
**Voie remplaçant la voie de peuple :** [Voie du mage](voies.md#mage)
```

### Voies (voies.md, prestige.md)

```markdown
<a id="sentinelle"></a>
#### Voie de la sentinelle

Texte d'introduction éventuel.

**1. Veille** (sort, L)

Texte de la capacité (Markdown libre, plusieurs paragraphes possibles).

**Bonus** : Init +2 · PER +1

**2. Garde**
…
```

- Une voie = un identifiant, un titre, puis 5 capacités `**N. Nom**`. Entre parenthèses : `sort` (compte
  pour les PM) et le type d'action `A`, `L`, `M` ou `G`. Les voies de **prestige.md** sont des voies de prestige,
  numérotées de 4 à 8.
- **`**Bonus** : …`** (facultatif, après le texte de la capacité) : bonus permanents appliqués par la fiche
  quand la capacité est acquise. Éléments séparés par ` · ` :

  | Élément | Effet |
  |---|---|
  | `DEF +1`, `Init +3`, `PV +1`, `PM +2`, `PC +1`, `DR +1` | bonus fixe (un `-` pour un malus) |
  | `Init +CHA`, `PV +FOR`, `PM +PER`… | bonus égal à une caractéristique |
  | `AGI +1` (AGI, CON, FOR, PER, CHA, INT, VOL) | la caractéristique augmente |
  | `PM = CHA + sorts` | les PM se calculent avec CHA au lieu de VOL |
  | `armes arc : DM +PER` | bonus avec les armes d'une catégorie (mots-clés d'equipement.md, ou `contact` / `distance`) |
  | `armes hache/marteau : attaque +1, DM +1` | plusieurs catégories ; effets `attaque`, `DM`, `critique +1` (zone élargie), `portée ×2` |

  Les bonus conditionnels (sans armure, une fois par combat…) ne se notent pas : ils se saisissent sur la
  fiche dans « Bonus divers ».
- **Variantes** (facultatif, après la 5ᵉ capacité) : versions de la voie au choix sur la fiche.

  ```markdown
  **Version standard** : Arc

  **Variante** (lancer) : Lancer (dague, hachette, javelot…) — Voie du lancer

  Les capacités s'appliquent aux armes de jet plutôt qu'à l'arc.

  **Bonus rang 1** : armes jet : DM +FOR, portée ×2
  ```

  Entre parenthèses, l'identifiant de la variante. Après le tiret, le nouveau nom de la voie (facultatif).
  Le paragraphe suivant est le rappel affiché sur la fiche. Si la variante a au moins une ligne
  `**Bonus rang N**`, ses bonus remplacent **tous** ceux de la voie (`**Bonus rang 1** : aucun` pour n'en
  garder aucun).
- Une voie se rattache à un profil par la liste **Voies** de profils.md, et à un peuple par la ligne
  **Voie(s)** de peuples.md. Une voie qui n'est dans aucune liste est proposée sur la fiche dans
  « Autres voies ».

### Profils (profils.md)

```markdown
<a id="guerrier"></a>
### Guerrier

*Description en italique.*

- **PV niveau 1** : 10 + CON · **PV par niveau** : 5 + CON · **Dé de récupération** : d10 · **Points de chance** : 2 + CHA
- **DR au niveau 1** : 2 + CON · **Caractéristiques clés** : FOR, CON, AGI · **Caractéristique de magie** : —
- Autre particularité (texte libre, affiché sur la fiche)

**Armes & armures.** …

**Équipement de départ.** …

> Encadré éventuel.

**Voies :**

- [Voie du bouclier](voies.md#bouclier) — résumé libre
```

La fiche lit les deux lignes de valeurs (seuls les nombres comptent : `10 + CON` → 10) et les liens de la
liste **Voies**.

### Peuples (peuples.md)

Un identifiant et un titre `## …`. La fiche lit la section `### Caractéristiques` (affichée telle quelle)
et les liens de la ligne `**Voie(s) :**`. Une section sans « Caractéristiques » (Mage) n'est pas un peuple.

### Armes, armures, boucliers (equipement.md)

Chaque ligne des tableaux dont la première colonne s'intitule **Arme**, **Armure** ou **Bouclier** est
proposée sur la fiche. Les colonnes sont reconnues par leur titre, dans n'importe quel ordre :

| Colonne | Contenu |
|---|---|
| Id | identifiant de l'objet (obligatoire, entre accents graves ou non) |
| DM | dé de dommages (`1d8`) |
| Portée | `20 m` (armes à distance) |
| Critique | `19-20` pour une zone élargie, `—` sinon |
| Mots-clés | catégories pour les bonus des voies (`arc`, `arbalète`, `poudre`, `hache`, `marteau`, `couteau`, `jet`…), et `sans FOR` (pas de FOR aux DM au contact) |
| Notes | rappel affiché sur la fiche |
| DEF, AGI max | armures et boucliers |

Une arme est « à distance » si le titre de sa section contient « distance », « au contact » sinon.

### Tableaux de regles.md

Le tableau dont la première colonne est **État** donne les états de la fiche et de l'initiative. Le tableau
**Série** donne les séries de caractéristiques, le tableau **Rang** / *Niveau requis* le niveau nécessaire
à chaque rang, et le tableau **Idéal héroïque** / **Travers** les listes de la fiche.

## Outils

Scripts Python 3 de [tools/drs/](../../tools/drs/) :

```powershell
python -I tools/drs/md2drs.py               # .md -> drs.json (avertit des liens et voies inconnus)
python -I tools/drs/gen_refs.py --check     # vérifie que md2drs.py ne perd rien (md -> json -> md)
python -I tools/drs/gen_refs.py             # remet voies, prestige, profils, familles et peuples au format canonique
```

`md2drs.py` lit les documents comme l'appli ([rules/parse.js](../../components/webapp/www/js/rules/parse.js)) :
une modification du format se fait dans les deux. `gen_refs.py` ne touche jamais `regles.md` ni `equipement.md`.

**Import initial depuis le site du DRS** (déjà fait, à ne relancer que pour repartir de zéro) :
`scrape.py` puis `parse_drs.py` produisent une extraction brute, sans balises **Bonus** ni variantes ni
familles. Écrivez-la dans un autre fichier que `drs.json` : la fusion avec les documents existants se fait à la main.

```powershell
python -I tools/drs/scrape.py <dossier_brut> tools/drs/slugs.txt          # ~170 pages, 1 requête/s
python -I tools/drs/parse_drs.py <dossier_brut> <dossier_brut>/drs_brut.json
```

## Structure de drs.json

```jsonc
{
  "source": "https://drs.chroniques-oubliees.fr/fantasy",
  "familles": { "mage": { "name": "Mages", "note": "…", "r2niv1": true, "alt": "mage" }, … },
  "profils": {
    "barbare": { "name": "Barbare", "famille": "combattant", "desc": "…",
                 "pv1": "10 + CON", "pvniv": "5", "dr": "d10", "drn": "2 + CON", "pc": "2 + CHA",
                 "car": "FOR, CON, AGI", "magie": "", "bonus": [ "…" ],
                 "armes": "…", "equipement": "…", "extra": "…", "voies": [ "brute", "pagne", … ] }, …
  },
  "peuples": { "gnome": { "name": "Gnome", "body": "…Markdown…", "voies": [ "gnome" ] }, … },
  "voies": {
    "archer": {
      "name": "Voie de l'archer", "famille": "aventurier", "prestige": false, "intro": "",
      "caps": [ { "rang": 1, "name": "Sens affûtés", "spell": false, "action": "",   // A, L, M, G ou ""
                  "text": "…Markdown…", "bonus": "Init +1 · armes arc : DM +PER" }, … ],
      "variantes": { "std": "Arc", "list": [ { "id": "lancer", "name": "Lancer (…)", "voie": "Voie du lancer",
                                               "note": "…", "bonus": { "1": "armes jet : DM +FOR, portée ×2" } } ] }
    }, …
  },
  "armes": [ { "id": "hache", "name": "Hache", "att": "contact", "dm": "1d8", "portee": 0, "crit": 20,
               "prix": "6 pa", "type": "Tranchants", "mots": [ "hache" ], "notes": "" }, … ],
  "armures": [ { "id": "cotte", "name": "Cotte de mailles", "def": 5, "agi": 3, "prix": "25 pa" }, … ],
  "boucliers": [ { "id": "petit", "name": "Petit bouclier", "def": 1, "prix": "2 pa" }, … ],
  "etats": [ { "name": "Affaibli", "effet": "…" }, … ],
  "series": [ { "name": "Expert", "valeurs": "+3, +2, +1, +1, 0, 0, −1" }, … ],
  "niveaux": { "1": 1, "2": 2, "3": 3, "4": 5, … },
  "ideaux": [ "Abnégation", … ], "travers": [ "Alcoolique", … ]
}
```
