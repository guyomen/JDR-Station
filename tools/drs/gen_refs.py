"""Génère references/COFv2/*.md à partir de references/COFv2/drs.json.

usage : python -I tools/drs/gen_refs.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
REF = ROOT / "references" / "COFv2"
D = json.loads((REF / "drs.json").read_text(encoding="utf-8"))
V, P, PE = D["voies"], D["profils"], D["peuples"]
SRC = D["source"]

FAM = {
    "aventurier": ("Aventuriers", ["arquebusier", "barde", "rodeur", "voleur"]),
    "combattant": ("Combattants", ["barbare", "chevalier", "guerrier"]),
    "mage": ("Mages", ["ensorceleur", "forgesort", "magicien", "sorcier"]),
    "mystique": ("Mystiques", ["druide", "moine", "pretre"]),
}
ACTIONS = {"A": "action d'attaque", "L": "action limitée", "M": "action de mouvement", "G": "action gratuite"}
NOTE = f"> Source : [DRS Chroniques Oubliées Fantasy]({SRC}) (Black Book Éditions). Extraction automatique, voir [README](README.md).\n"


def link(slug, page="voies.md"):
    return f"[{V[slug]['name']}]({page}#{slug})"


def plink(p):
    return f"[{P[p]['name']}](profils.md#{p})"


def demote(md, levels=2):
    return "\n".join(("#" * levels + l) if l.startswith("#") else l for l in md.split("\n"))


def cap_line(c):
    tags = []
    if c["spell"]:
        tags.append("sort")
    if c["action"]:
        tags.append(c["action"])
    return f"**{c['rang']}. {c['name']}**" + (f" ({', '.join(tags)})" if tags else "")


def voie_md(slug, level="###"):
    v = V[slug]
    out = [f'<a id="{slug}"></a>', f"{level} {v['name']}", ""]
    if v["intro"]:
        out += [v["intro"], ""]
    for c in v["caps"]:
        out += [cap_line(c), "", c["text"], ""]
    return "\n".join(out)


def caps_summary(slug):
    return " · ".join(f"{c['rang']} {c['name']}{'*' if c['spell'] else ''}" for c in V[slug]["caps"])


def write(name, text):
    (REF / name).write_text(text.strip() + "\n", encoding="utf-8")
    print("écrit", name, len(text))


# ---------------- voies.md (voies de profil et de peuple)
parts = ["# Voies de profil et de peuple", "", NOTE,
         "Chaque voie a 5 capacités (rangs 1 à 5). `*` / « sort » = capacité de sort (compte pour les PM). "
         "Actions : A = attaque, L = limitée, M = mouvement, G = gratuite.", "", "## Sommaire", ""]
for fam, (label, profs) in FAM.items():
    parts.append(f"- **{label}** : " + " · ".join(f"[{P[p]['name']}](#profil-{p})" for p in profs))
parts.append("- **Peuples** : " + " · ".join(link(s, "") for s in sorted({s for p in PE.values() for s in p["voies"]})))
parts.append("")
for fam, (label, profs) in FAM.items():
    parts += [f"## {label}", ""]
    for p in profs:
        parts += [f'<a id="profil-{p}"></a>', f"### {P[p]['name']}", ""]
        for s in P[p]["voies"]:
            parts.append(voie_md(s, "####"))
parts += ["## Voies de peuple", ""]
for s in ["demi-orc", "elfe-haut", "elfe-sylvain", "gnome", "halfelin", "humain", "nain", "mage"]:
    parts.append(voie_md(s, "###"))
write("voies.md", "\n".join(parts))

# ---------------- prestige.md
parts = ["# Voies de prestige", "", NOTE,
         "Accessibles à partir du niveau 5, une seule par personnage, dans la famille de son profil principal "
         "ou parmi les voies génériques. Rangs 4 à 8 (niveaux requis 5 / 7 / 9 / 11 / 13).", "", "## Sommaire", ""]
groups = [("generique", "Génériques")] + [(k, v[0]) for k, v in FAM.items()]
for key, label in groups:
    ss = sorted((s for s, v in V.items() if v["prestige"] and v["famille"] == key), key=lambda s: V[s]["name"])
    parts.append(f"- **{label}** : " + " · ".join(f"[{V[s]['name'].replace('Voie ', '')}](#{s})" for s in ss))
parts.append("")
for key, label in groups:
    parts += [f"## {label}", ""]
    for s in sorted((s for s, v in V.items() if v["prestige"] and v["famille"] == key), key=lambda s: V[s]["name"]):
        parts.append(voie_md(s, "###"))
write("prestige.md", "\n".join(parts))

# ---------------- profils.md
parts = ["# Profils", "", NOTE, "Le texte complet des voies est dans [voies.md](voies.md).", ""]
for fam, (label, profs) in FAM.items():
    parts += [f"## {label}", ""]
    for p in profs:
        pr = P[p]
        parts += [f'<a id="{p}"></a>', f"### {pr['name']}", "", f"*{pr['desc']}*", "",
                  f"- **PV niveau 1** : {pr['pv1']} · **PV par niveau** : {pr['pvniv']} + CON · "
                  f"**Dé de récupération** : {pr['dr']} · **Points de chance** : {pr['pc']}"]
        parts += [f"- {b}" for b in pr["bonus"]]
        parts += ["", "**Armes & armures.** " + pr["armes"].replace("\n\n", " "), "",
                  "**Équipement de départ.** " + pr["equipement"], ""]
        if pr.get("extra"):
            parts += ["> " + pr["extra"].replace("\n", "\n> "), ""]
        parts += ["**Voies :**", ""]
        parts += [f"- {link(s)} — {caps_summary(s)}" for s in pr["voies"]]
        parts.append("")
write("profils.md", "\n".join(parts))

# ---------------- familles.md
parts = ["# Familles de profils", "", NOTE,
         "| Famille | Profils | PV niv. 1 | PV / niveau | DR | PC | Particularité |", "|---|---|---|---|---|---|---|"]
for fam, (label, profs) in FAM.items():
    pr = P[profs[0]]
    bonus = "; ".join(b.replace("**", "") for b in pr["bonus"]) or ("+1 PC" if "3 +" in pr["pc"] else "—")
    parts.append(f"| {label} | {', '.join(plink(p) for p in profs)} | {pr['pv1']} | "
                 f"{pr['pvniv']} + CON | {pr['dr']} | {pr['pc']} | {bonus} |")
parts += ["", "Rappels (livre de règles) : DR au niveau 1 = 2 + CON dés (+1 pour les mystiques) ; "
          "PV = PV niv. 1 puis + (PV / niveau) à chaque niveau ; les mages peuvent remplacer leur voie de peuple "
          "par la [voie du mage](voies.md#mage).", ""]
for fam, (label, profs) in FAM.items():
    prest = sorted((s for s, v in V.items() if v["prestige"] and v["famille"] == fam), key=lambda s: V[s]["name"])
    parts += [f"## {label}", "",
              "**Profils :** " + ", ".join(plink(p) for p in profs), "",
              "**Voies de profil :** " + ", ".join(link(s) for p in profs for s in P[p]["voies"]), "",
              "**Voies de prestige :** " + ", ".join(link(s, "prestige.md") for s in prest), ""]
gen = sorted((s for s, v in V.items() if v["prestige"] and v["famille"] == "generique"), key=lambda s: V[s]["name"])
parts += ["## Voies de prestige génériques", "", ", ".join(link(s, "prestige.md") for s in gen), ""]
write("familles.md", "\n".join(parts))

# ---------------- peuples.md
parts = ["# Peuples", "", NOTE, "Le texte complet des voies de peuple est dans [voies.md](voies.md#voies-de-peuple).", ""]
for s in ["demi-elfe", "demi-orc", "elfe-haut", "elfe-sylvain", "gnome", "halfelin", "humain", "nain", "mage"]:
    pe = PE[s]
    body = pe["header_md"].split("\n", 1)[1] if "\n" in pe["header_md"] else ""
    parts += [f'<a id="{s}"></a>', f"## {pe['name']}", "", body.strip(), "",
              "**Voie(s) :** " + ", ".join(f"{link(v)} — {caps_summary(v)}" for v in pe["voies"]), ""]
write("peuples.md", "\n".join(parts))
