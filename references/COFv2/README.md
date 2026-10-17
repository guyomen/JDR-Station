# Références — Chroniques Oubliées Fantasy 2e édition

Documentation de règles utilisée par JDR Station (appli et code).

| Fichier | Contenu | Source |
|---|---|---|
| [regles.md](regles.md) | Aide-mémoire des règles : création, progression, tests, combat, magie, aventure (peuples, profils et voies : voir les fichiers suivants) | Livre de règles (PDF) |
| [equipement.md](equipement.md) | Équipement : monnaie, matériel courant, montures, auberge, armes, armures et boucliers, qualité, exotique | Livre de règles (PDF) |
| [familles.md](familles.md) | Les 4 familles de profils : PV, DR, PC, particularités, voies de profil et de prestige | DRS |
| [profils.md](profils.md) | Les 14 profils : description, PV, DR, PC, armes et armures, équipement, résumé des 5 voies | DRS |
| [peuples.md](peuples.md) | Les 8 peuples et la voie du mage : caractéristiques, repères, noms, voie de peuple | DRS |
| [voies.md](voies.md) | Texte complet des 78 voies de profil et de peuple (5 capacités chacune) | DRS |
| [prestige.md](prestige.md) | Texte complet des 54 voies de prestige (rangs 4 à 8) | DRS |
| [drs.json](drs.json) | Toutes les données ci-dessus, structurées, pour le code | DRS |

DRS = [Document de référence du système](https://drs.chroniques-oubliees.fr/fantasy), la version web officielle
des règles publiée par Black Book Éditions. © Black Book Éditions : ces fichiers servent de référence
personnelle pour le projet ; ne pas les redistribuer.

## Structure de drs.json

```jsonc
{
  "source": "https://drs.chroniques-oubliees.fr/fantasy",
  "index":   { "Voie de l'air": { "prestige": false, "famille": "mage", "source": "Livre des règles" }, … },
  "voies": {
    "air": {
      "slug": "air", "name": "Voie de l'air", "intro": "",          // intro : texte d'introduction (prestige)
      "famille": "mage",            // aventurier | combattant | mage | mystique | peuple | generique
      "prestige": false, "source": "Livre des règles",
      "caps": [ { "rang": 1, "name": "Murmures dans le vent", "spell": true,
                  "action": "G",    // A attaque, L limitée, M mouvement, G gratuite, "" passive
                  "text": "…Markdown…" }, … ]                   // 5 capacités (rangs 1-5, ou 4-8 en prestige)
    }, …
  },
  "profils": {
    "barbare": { "slug": "barbare", "name": "Barbare", "desc": "…",
                 "pv1": "10 + CON", "pvniv": "5", "dr": "d10", "pc": "2 + CHA",
                 "bonus": [ "…particularités de famille…" ],
                 "armes": "…", "equipement": "…", "extra": "…encadré éventuel…",
                 "voies": [ "brute", "pagne", "pourfendeur", "primitif", "rage" ],
                 "header_md": "…en-tête complet en Markdown…" }, …
  },
  "peuples": {
    "gnome": { "slug": "gnome", "name": "Gnome", "voies": [ "gnome" ], "header_md": "…" }, …
  }
}
```

## Régénérer

Les scripts sont dans [tools/drs/](../../tools/drs/) (Python 3, Microsoft Edge pour le rendu des pages) :

```powershell
python -I tools/drs/scrape.py <dossier_brut> tools/drs/slugs.txt    # ~170 pages, 1 requête/s
python -I tools/drs/parse_drs.py <dossier_brut> references/COFv2/drs.json
python -I tools/drs/gen_refs.py                                      # fichiers .md
python -I tools/drs/gen_app.py                                       # données de l'appli (components/webapp/www/js/data/cof2_drs.js)
```
