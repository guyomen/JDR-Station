"""Génère components/webapp/www/js/data/cof2_drs.js (données du DRS pour l'appli) à partir de references/COFv2/drs.json.

Format compact (servi compressé en gzip par l'ESP32) :
  COF2_DRS.voies[slug]   = [nom, famille, prestige 0/1, intro, [[nom, sort 0/1, action, texte] × 5]]
  COF2_DRS.profils[slug] = { d: description, a: armes & armures, e: équipement, x: encadré, b: [bonus], v: [voies] }
  COF2_DRS.peuples[slug] = { n: nom, m: modificateurs, v: [voies] }

usage : python -I tools/drs/gen_app.py
"""
import gzip
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
D = json.loads((ROOT / "references" / "COFv2" / "drs.json").read_text(encoding="utf-8"))

voies = {
    s: [v["name"], v["famille"], int(v["prestige"]), v["intro"],
        [[c["name"], int(c["spell"]), c["action"], c["text"]] for c in v["caps"]]]
    for s, v in sorted(D["voies"].items())
}
profils = {
    s: {"d": p["desc"], "a": p["armes"], "e": p["equipement"], "x": p["extra"], "b": p["bonus"], "v": p["voies"]}
    for s, p in D["profils"].items()
}


def peuple_mod(head):
    m = re.search(r"#+ Caractéristiques\s*\n(.*?)(?=\n#+ |\Z)", head, flags=re.S)
    return m.group(1).strip().replace("‐", "−") if m else ""


peuples = {s: {"n": p["name"], "m": peuple_mod(p["header_md"]), "v": p["voies"]} for s, p in D["peuples"].items()}

js = ("'use strict';\n/* Généré par tools/drs/gen_app.py depuis references/COFv2/drs.json — ne pas modifier à la main.\n"
      " * Source : DRS Chroniques Oubliées Fantasy, © Black Book Éditions. */\n"
      "const COF2_DRS = " + json.dumps({"voies": voies, "profils": profils, "peuples": peuples},
                                         ensure_ascii=False, separators=(",", ":")) + ";\n")
out = ROOT / "components" / "webapp" / "www" / "js" / "data" / "cof2_drs.js"
out.write_text(js, encoding="utf-8", newline="\n")
raw = js.encode("utf-8")
print(f"{out.name} : {len(raw)} octets, {len(gzip.compress(raw, 9))} en gzip")
