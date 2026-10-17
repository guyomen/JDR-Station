"""Génère references/COFv2/drs.json à partir des documents Markdown (la référence des règles).

Même lecture que l'appli (components/webapp/www/js/rules/parse.js) : à garder synchronisés.
Format des balises lues : voir references/COFv2/README.md.

usage : python -I tools/drs/md2drs.py [--dir references/COFv2] [--out drs.json]
"""
import argparse
import json
import pathlib
import re
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[2]
REF = ROOT / "references" / "COFv2"
DOCS = ["regles", "familles", "profils", "peuples", "voies", "prestige", "equipement"]
SOURCE = "https://drs.chroniques-oubliees.fr/fantasy"

ANCHOR = re.compile(r'^<a id="([\w-]+)"></a>\s*$')
HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*$")
LABEL = re.compile(r"^\*\*([^*]+?)\s*:?\*\*\s*:?\s*(.*)$")
CAP = re.compile(r"^\*\*(\d+)\. (.+?)\*\*(?: \(([^)]*)\))?\s*$")
VARIANTE = re.compile(r"^\*\*Variante\*\* \(([\w-]+)\) : (.*?)(?: — (.+))?\s*$")
BONUS_RANG = re.compile(r"^\*\*Bonus rang (\d+)\*\* : (.*)$")
LINK_ID = re.compile(r"\]\((?:[\w-]+\.md)?#([\w-]+)\)")


def fold(s):
    return unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower().strip()


def trim(lines):
    return "\n".join(lines).strip()


def label(line):
    """« **Libellé** : valeur » ou « **Libellé :** valeur » -> (libellé, valeur), sinon None."""
    m = LABEL.match(line)
    return (m.group(1).strip(), m.group(2).strip()) if m else None


# ---------------- voies.md / prestige.md
def parse_voies(text, prestige, out, warn):
    famille, voie, cap, var, anchor = "", None, None, None, None
    buf = None  # lignes de texte en cours (intro, capacité ou note de variante)

    def close():
        nonlocal voie, cap, var, buf
        if cap is not None:
            cap["text"] = trim(buf)
        elif var is not None:
            var["note"] = trim(buf)
        elif voie is not None:
            voie["intro"] = trim(buf)
        cap = var = None
        buf = []

    def end_voie():
        nonlocal voie
        close()
        voie = None

    for line in text.replace("\r", "").split("\n"):
        m = ANCHOR.match(line)
        if m:
            anchor = m.group(1)
            continue
        h = HEADING.match(line)
        if h:
            end_voie()
            if anchor and anchor.startswith("famille-"):
                famille = anchor[8:]
            elif anchor and not anchor.startswith("profil-"):
                if anchor in out:
                    warn(f"voie « {anchor} » définie deux fois")
                voie = out[anchor] = {"name": h.group(2), "famille": famille, "prestige": prestige, "intro": "", "caps": []}
            anchor = None
            continue
        anchor = None
        if voie is None:
            continue
        m = CAP.match(line)
        if m and var is None:
            close()
            tags = [t.strip() for t in (m.group(3) or "").split(",") if t.strip()]
            cap = {"rang": int(m.group(1)), "name": m.group(2), "spell": "sort" in tags,
                   "action": next((t for t in tags if t in ("A", "L", "M", "G")), ""), "text": "", "bonus": ""}
            voie["caps"].append(cap)
            continue
        lb = label(line)
        if lb and lb[0] == "Bonus" and cap is not None:
            cap["bonus"] = lb[1]
            continue
        if lb and lb[0] == "Version standard":
            close()
            voie.setdefault("variantes", {"std": "", "list": []})["std"] = lb[1]
            continue
        m = VARIANTE.match(line)
        if m:
            close()
            var = {"id": m.group(1), "name": m.group(2), "voie": m.group(3) or "", "note": "", "bonus": {}}
            voie.setdefault("variantes", {"std": "Standard", "list": []})["list"].append(var)
            continue
        m = BONUS_RANG.match(line)
        if m and var is not None:
            var["bonus"][m.group(1)] = m.group(2).strip()
            continue
        buf.append(line)
    end_voie()


# ---------------- profils.md
PROFIL_FIELDS = {"PV niveau 1": "pv1", "PV par niveau": "pvniv", "Dé de récupération": "dr", "Points de chance": "pc",
                 "DR au niveau 1": "drn", "Caractéristiques clés": "car", "Caractéristique de magie": "magie"}


def parse_profils(text, warn):
    out, famille, pr, anchor, mode = {}, "", None, None, ""
    for line in text.replace("\r", "").split("\n"):
        m = ANCHOR.match(line)
        if m:
            anchor = m.group(1)
            continue
        h = HEADING.match(line)
        if h:
            pr = None
            if anchor and anchor.startswith("famille-"):
                famille = anchor[8:]
            elif anchor:
                pr = out[anchor] = {"name": h.group(2), "famille": famille, "desc": "", "pv1": "", "pvniv": "", "dr": "",
                                    "drn": "", "pc": "", "car": "", "magie": "", "bonus": [], "armes": "",
                                    "equipement": "", "extra": "", "voies": []}
                mode = ""
            anchor = None
            continue
        anchor = None
        if pr is None or not line.strip():
            if pr is not None and mode in ("armes", "equipement"):
                mode = ""
            continue
        if line.startswith(">"):
            pr["extra"] = (pr["extra"] + "\n" if mode == "extra" else "") + re.sub(r"^> ?", "", line)
            mode = "extra"
            continue
        if line.startswith("**Armes & armures.**"):
            pr["armes"], mode = line[len("**Armes & armures.**"):].strip(), "armes"
            continue
        if line.startswith("**Équipement de départ.**"):
            pr["equipement"], mode = line[len("**Équipement de départ.**"):].strip(), "equipement"
            continue
        if line.startswith("**Voies :**"):
            mode = "voies"
            continue
        if mode == "voies" and line.startswith("- "):
            m = LINK_ID.search(line)
            if m:
                pr["voies"].append(m.group(1))
            else:
                warn(f"profil « {pr['name']} » : voie sans lien ({line[2:40]}…)")
            continue
        if mode in ("armes", "equipement"):
            pr[mode] += " " + line.strip()
            continue
        if line.startswith("- "):
            parts = [label(p.strip()) for p in line[2:].split(" · ")]
            if parts and all(p and p[0] in PROFIL_FIELDS for p in parts):
                for k, v in parts:
                    v = "" if v in ("—", "-") else v
                    pr[PROFIL_FIELDS[k]] = re.sub(r"\s*\+\s*CON$", "", v) if k == "PV par niveau" else v
            else:
                pr["bonus"].append(line[2:])
            continue
        if not pr["desc"] and line.startswith("*") and line.endswith("*") and not line.startswith("**"):
            pr["desc"] = line[1:-1]
    return out


# ---------------- peuples.md
def parse_peuples(text):
    out, pe, anchor, body = {}, None, None, []

    def close():
        if pe is not None:
            pe["body"] = trim(body)

    for line in text.replace("\r", "").split("\n"):
        m = ANCHOR.match(line)
        if m:
            anchor = m.group(1)
            continue
        h = HEADING.match(line)
        if h and len(h.group(1)) <= 2:
            close()
            pe, body = None, []
            if anchor:
                pe = out[anchor] = {"name": h.group(2), "body": "", "voies": []}
            anchor = None
            continue
        anchor = None
        if pe is None:
            continue
        if line.startswith("**Voie(s) :**"):
            pe["voies"] = LINK_ID.findall(line)
            continue
        body.append(line)
    close()
    return out


# ---------------- familles.md
def parse_familles(text):
    out, fa, anchor = {}, None, None
    for line in text.replace("\r", "").split("\n"):
        m = ANCHOR.match(line)
        if m:
            anchor = m.group(1)
            continue
        h = HEADING.match(line)
        if h:
            fa = None
            if anchor and anchor.startswith("famille-"):
                fa = out[anchor[8:]] = {"name": h.group(2), "note": "", "r2niv1": False, "alt": ""}
            anchor = None
            continue
        anchor = None
        lb = label(line) if fa is not None else None
        if not lb:
            continue
        if lb[0] == "Particularité":
            fa["note"] = lb[1]
        elif lb[0] == "Rang 2 dès le niveau 1":
            fa["r2niv1"] = fold(lb[1]) in ("oui", "yes", "1", "vrai")
        elif lb[0] == "Voie remplaçant la voie de peuple":
            m = LINK_ID.search(lb[1])
            fa["alt"] = m.group(1) if m else ""
    return out


# ---------------- tableaux (regles.md, equipement.md)
def tables(text):
    """[(titre de section, en-têtes, lignes)] ; les cellules sont nettoyées."""
    out, title, cur = [], "", None
    for line in text.replace("\r", "").split("\n"):
        h = HEADING.match(line)
        if h:
            title = h.group(2)
        m = re.match(r"^\|(.*)\|\s*$", line)
        if not m:
            cur = None
            continue
        cells = [c.strip() for c in m.group(1).split("|")]
        if all(re.match(r"^:?-*:?$", c) for c in cells):
            continue
        if cur is None:
            cur = (title, cells, [])
            out.append(cur)
        else:
            cur[2].append(cells)
    return out


def clean(c):
    c = re.sub(r"\*\*|`", "", c).strip()
    return "" if c in ("—", "–", "-") else c


def num(c):
    m = re.search(r"[-+]?\d+", c.replace("−", "-"))
    return int(m.group(0)) if m else 0


def parse_regles(text, out):
    for title, head, rows in tables(text):
        h0 = fold(head[0])
        if h0 == "etat":
            out["etats"] = [{"name": clean(r[0]), "effet": clean(r[1])} for r in rows]
        elif h0 == "serie":
            out["series"] = [{"name": clean(r[0]), "valeurs": clean(r[1])} for r in rows]
        elif h0 == "rang":
            row = next((r for r in rows if fold(clean(r[0])) == "niveau requis"), None)
            if row:
                out["niveaux"] = {clean(k): num(v) for k, v in zip(head[1:], row[1:])}
        elif h0.startswith("ideal"):
            out["ideaux"] = [clean(r[0]) for r in rows if clean(r[0])]
            out["travers"] = [clean(r[1]) for r in rows if len(r) > 1 and clean(r[1])]


def parse_equipement(text, out, warn):
    out["armes"], out["armures"], out["boucliers"] = [], [], []
    for title, head, rows in tables(text):
        cols = [fold(c) for c in head]
        col = lambda r, name: clean(r[cols.index(name)]) if name in cols and cols.index(name) < len(r) else ""
        kind = cols[0]
        for r in rows:
            name = re.sub(r"\s*[¹²³⁴#*]+$", "", col(r, kind))
            oid = col(r, "id")
            if kind in ("arme", "armure", "bouclier") and not oid:
                warn(f"{kind} « {name} » sans Id : ignorée")
                continue
            if kind == "arme":
                crit = col(r, "critique")
                out["armes"].append({
                    "id": oid, "name": name, "att": "distance" if "distance" in fold(title) else "contact",
                    "dm": col(r, "dm"), "portee": num(col(r, "portee")), "crit": num(crit) if crit else 20,
                    "prix": col(r, "prix"), "type": col(r, "type"),
                    "mots": [m.strip() for m in col(r, "mots-cles").split(",") if m.strip()], "notes": col(r, "notes")})
            elif kind == "armure":
                out["armures"].append({"id": oid, "name": name, "def": num(col(r, "def")), "agi": num(col(r, "agi max")),
                                       "prix": col(r, "prix")})
            elif kind == "bouclier":
                out["boucliers"].append({"id": oid, "name": name, "def": num(col(r, "def")), "prix": col(r, "prix")})


def parse_all(texts, warn=print):
    out = {"source": SOURCE, "familles": parse_familles(texts.get("familles", "")),
           "profils": parse_profils(texts.get("profils", ""), warn),
           "peuples": parse_peuples(texts.get("peuples", "")), "voies": {}}
    parse_voies(texts.get("voies", ""), False, out["voies"], warn)
    parse_voies(texts.get("prestige", ""), True, out["voies"], warn)
    parse_regles(texts.get("regles", ""), out)
    parse_equipement(texts.get("equipement", ""), out, warn)
    # Renvois vers des voies inconnues : erreur de saisie probable.
    for kind in ("profils", "peuples"):
        for k, o in out[kind].items():
            for v in o["voies"]:
                if v not in out["voies"]:
                    warn(f"{kind[:-1]} « {k} » : voie inconnue « {v} »")
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dir", type=pathlib.Path, default=REF)
    ap.add_argument("--out", type=pathlib.Path, default=REF / "drs.json")
    args = ap.parse_args()
    warnings = []
    texts = {d: (args.dir / f"{d}.md").read_text(encoding="utf-8") for d in DOCS if (args.dir / f"{d}.md").is_file()}
    data = parse_all(texts, warnings.append)
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"{args.out.name} : {len(data['voies'])} voies, {len(data['profils'])} profils, {len(data['peuples'])} peuples, "
          f"{len(data['armes'])} armes, {len(data['armures'])} armures")
    for w in warnings:
        print("attention :", w, file=sys.stderr)


if __name__ == "__main__":
    main()
