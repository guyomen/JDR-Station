"""Analyse les pages rendues du DRS (Chroniques Oubliées Fantasy 2) et produit drs.json.

usage : python -I parse_drs.py <dossier raw> <sortie.json>
"""
import html
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from drs_md import page_to_md  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
RAW = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])

PROFILS = "arquebusier barbare barde chevalier druide ensorceleur forgesort guerrier magicien moine pretre rodeur sorcier voleur".split()
PEUPLES = "demi-elfe demi-orc elfe-haut elfe-sylvain gnome halfelin humain mage nain".split()
FAMILLES = {"Aventurier": "aventurier", "Combattant": "combattant", "Mage": "mage", "Mystique": "mystique",
            "Générique": "generique", "Peuple": "peuple"}


def plain_lines(path):
    t = path.read_text(encoding="utf-8")
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
    return [l.strip() for l in html.unescape(re.sub(r"<[^>]+>", "\n", body)).split("\n") if l.strip()]


def slugify(s):
    import unicodedata
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"^voie (de la |de l'|du |des |de |d')", "", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# ---------- Index des voies : nom -> (prestige, famille, source)
index = {}
for i in range(1, 15):
    L = plain_lines(RAW / f"voies_page={i}.html")
    try:
        start = L.index("Source") + 1
    except ValueError:
        continue
    j = start
    while j < len(L) and L[j].startswith("Voie"):
        name = L[j]
        j += 1
        prestige = False
        if L[j] == "Prestige":
            prestige = True
            j += 1
        fam = L[j]
        src = L[j + 1]
        j += 2
        index[name] = {"prestige": prestige, "famille": FAMILLES.get(fam, fam), "source": src}


def split_caps(md):
    """Découpe un Markdown balisé en blocs [(titre, intro, [capacités])]."""
    voies = []
    cur = None
    cap = None
    for line in md.split("\n"):
        if line.startswith("@@TITLE "):
            cur = {"name": line[8:].strip(), "intro": [], "caps": []}
            voies.append(cur)
            cap = None
        elif line.startswith("@@CAP "):
            r, name, spell = line[6:].split("|")
            cap = {"rang": int(r), "name": name.strip(), "spell": spell == "1", "action": "", "text": []}
            if cur is None:
                cur = {"name": "", "intro": [], "caps": []}
                voies.append(cur)
            cur["caps"].append(cap)
        elif line.startswith("@@ACT "):
            if cap is not None:
                cap["action"] = line[6:].strip()
        elif line.startswith("@@SPELL"):
            if cap is not None:
                cap["spell"] = True
        else:
            (cap["text"] if cap is not None else cur["intro"] if cur is not None else []).append(line)
    for v in voies:
        v["intro"] = "\n".join(v["intro"]).strip()
        for c in v["caps"]:
            c["text"] = re.sub(r"\n{3,}", "\n\n", "\n".join(c["text"])).strip()
    return voies


# ---------- Voies (pages de détail)
voies = {}
for f in sorted(RAW.glob("voies__*.html")):
    slug = f.stem.split("__", 1)[1]
    md = page_to_md(f)
    blocks = split_caps(md)
    if not blocks:
        print("!! aucune capacité :", slug)
        continue
    b = blocks[0]
    meta = index.get(b["name"], {})
    voies[slug] = {"slug": slug, "name": b["name"], "intro": b["intro"], "caps": b["caps"],
                   "prestige": meta.get("prestige", False), "famille": meta.get("famille", "?"),
                   "source": meta.get("source", "")}
    if len(b["caps"]) != 5:
        print(f"!! {slug} : {len(b['caps'])} capacités")

name_to_slug = {v["name"]: s for s, v in voies.items()}


def header_and_voies(f):
    md = page_to_md(f)
    head = md.split("@@TITLE", 1)[0]
    blocks = split_caps(md)
    return md, head, blocks


def field(head, label):
    m = re.search(r"\*\*" + label + r"[^*]*?:\*\*\s*([^\n]+)", head)
    return m.group(1).strip() if m else ""


def section(head, title):
    m = re.search(r"#+ " + re.escape(title) + r"[^\n]*\n(.*?)(?=\n#+ |\Z)", head, flags=re.S)
    return m.group(1).strip() if m else ""


# ---------- Profils
profils = {}
for slug in PROFILS:
    md, head, blocks = header_and_voies(RAW / f"profils__{slug}.html")
    lines = [l for l in head.split("\n") if l.strip()]
    name = lines[0].lstrip("# ").strip()
    desc = lines[1].strip() if len(lines) > 1 and not lines[1].startswith("-") else ""
    bullets = [l[2:].strip() for l in head.split("\n") if l.startswith("- ")]
    vslugs = []
    for b in blocks:
        s = name_to_slug.get(b["name"])
        if not s:
            print(f"!! {slug} : voie inconnue {b['name']!r}")
        else:
            vslugs.append(s)
    equip = section(head, "Équipement de départ")
    profils[slug] = {
        "slug": slug, "name": name, "desc": desc,
        "pv1": field(head, "Points de vigueur au niveau"), "pvniv": field(head, "Points de vigueur / niveau"),
        "dr": field(head, "Dé de récupération"), "pc": field(head, "Points de chance"),
        "bonus": [b for b in bullets if not re.match(r"\*\*(Points de|Dé de)", b)],
        "armes": section(head, "Armes & armures"),
        "equipement": equip.split("\n")[0],
        "extra": "\n".join(equip.split("\n")[1:]).strip(),  # encadré « variante » éventuel
        "header_md": head.strip(), "voies": vslugs,
    }

# ---------- Peuples
peuples = {}
for slug in PEUPLES:
    md, head, blocks = header_and_voies(RAW / f"peuples__{slug}.html")
    lines = [l for l in head.split("\n") if l.strip()]
    vslugs = [name_to_slug[b["name"]] for b in blocks if b["name"] in name_to_slug]
    peuples[slug] = {"slug": slug, "name": lines[0].lstrip("# ").strip(), "header_md": head.strip(),
                     "voies": vslugs, "unknown_voies": [b["name"] for b in blocks if b["name"] not in name_to_slug]}

json.dump({"source": "https://drs.chroniques-oubliees.fr/fantasy", "index": index, "voies": voies,
           "profils": profils, "peuples": peuples}, OUT.open("w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(voies)} voies, {len(profils)} profils, {len(peuples)} peuples, index {len(index)}")
print("prestige :", sum(v["prestige"] for v in voies.values()))
