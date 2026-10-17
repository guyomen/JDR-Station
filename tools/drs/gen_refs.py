"""Réécrit les documents issus du DRS (voies, prestige, profils, familles, peuples) à partir de drs.json.

Les .md sont la référence (voir md2drs.py) : ce script sert à les remettre au format canonique, et à
vérifier que md2drs.py ne perd rien (--check : md -> drs.json -> md doit redonner les mêmes fichiers).
regles.md et equipement.md, écrits à la main, ne sont jamais réécrits.

usage : python -I tools/drs/gen_refs.py [--json drs.json] [--out dossier] [--check]
"""
import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
REF = ROOT / "references" / "COFv2"
DOCS = ["voies.md", "prestige.md", "profils.md", "familles.md", "peuples.md"]


def build(D):
    V, P, PE, F = D["voies"], D["profils"], D["peuples"], D["familles"]
    src = D.get("source", "https://drs.chroniques-oubliees.fr/fantasy")
    note = f"> Source : [DRS Chroniques Oubliées Fantasy]({src}) (Black Book Éditions). Format des balises : voir [README](README.md).\n"
    fams = [k for k in F if any(p["famille"] == k for p in P.values())]
    profs = {k: [p for p, d in P.items() if d["famille"] == k] for k in fams}
    docs = {}

    def link(slug, page="voies.md"):
        return f"[{V[slug]['name']}]({page}#{slug})" if slug in V else slug

    def plink(p):
        return f"[{P[p]['name']}](profils.md#{p})"

    def caps_summary(slug):
        return " · ".join(f"{c['rang']} {c['name']}{'*' if c['spell'] else ''}" for c in V[slug]["caps"]) if slug in V else ""

    def cap_line(c):
        tags = (["sort"] if c["spell"] else []) + ([c["action"]] if c["action"] else [])
        return f"**{c['rang']}. {c['name']}**" + (f" ({', '.join(tags)})" if tags else "")

    def voie_md(slug, level):
        v = V[slug]
        out = [f'<a id="{slug}"></a>', f"{level} {v['name']}", ""]
        if v["intro"]:
            out += [v["intro"], ""]
        for c in v["caps"]:
            out += [cap_line(c), ""]
            if c["text"]:
                out += [c["text"], ""]
            if c.get("bonus"):
                out += [f"**Bonus** : {c['bonus']}", ""]
        var = v.get("variantes")
        if var:
            out += [f"**Version standard** : {var['std']}", ""]
            for o in var["list"]:
                out += [f"**Variante** ({o['id']}) : {o['name']}" + (f" — {o['voie']}" if o["voie"] else ""), ""]
                if o["note"]:
                    out += [o["note"], ""]
                out += [f"**Bonus rang {r}** : {b}" for r, b in o["bonus"].items()] + ([""] if o["bonus"] else [])
        return "\n".join(out)

    # ---------------- voies.md (voies de profil et de peuple)
    parts = ["# Voies de profil et de peuple", "", note,
             "Chaque voie a 5 capacités (rangs 1 à 5). `*` / « sort » = capacité de sort (compte pour les PM). "
             "Actions : A = attaque, L = limitée, M = mouvement, G = gratuite. "
             "**Bonus** : bonus permanents appliqués automatiquement par la fiche.", "", "## Sommaire", ""]
    peuple_voies = list(dict.fromkeys([s for p in PE.values() for s in p["voies"] if s in V and V[s]["famille"] == "peuple"]
                                      + [s for s, v in V.items() if v["famille"] == "peuple" and not v["prestige"]]))
    for fam in fams:
        parts.append(f"- **{F[fam]['name']}** : " + " · ".join(f"[{P[p]['name']}](#profil-{p})" for p in profs[fam]))
    parts.append("- **Peuples** : " + " · ".join(link(s, "") for s in sorted(peuple_voies)))
    parts.append("")
    done = set(peuple_voies)
    for fam in fams:
        parts += [f'<a id="famille-{fam}"></a>', f"## {F[fam]['name']}", ""]
        for p in profs[fam]:
            parts += [f'<a id="profil-{p}"></a>', f"### {P[p]['name']}", ""]
            for s in P[p]["voies"]:
                if s in V and s not in done and not V[s]["prestige"]:
                    parts.append(voie_md(s, "####"))
                    done.add(s)
        rest = [s for s, v in V.items() if v["famille"] == fam and not v["prestige"] and s not in done]
        if rest:
            parts += ["### Autres voies", ""]
            for s in rest:
                parts.append(voie_md(s, "####"))
                done.add(s)
    parts += ['<a id="famille-peuple"></a>', "## Voies de peuple", ""]
    for s in peuple_voies:
        parts.append(voie_md(s, "###"))
    rest = [s for s, v in V.items() if not v["prestige"] and s not in done]
    if rest:
        sys.exit("gen_refs: voies sans famille connue : " + ", ".join(rest))
    docs["voies.md"] = parts

    # ---------------- prestige.md
    parts = ["# Voies de prestige", "", note,
             "Accessibles à partir du niveau 5, une seule par personnage, dans la famille de son profil principal "
             "ou parmi les voies génériques. Rangs 4 à 8 (niveaux requis 5 / 7 / 9 / 11 / 13).", "", "## Sommaire", ""]
    groups = ["generique"] + fams + [k for k in F if k not in fams and k != "generique"]
    by_name = lambda key: sorted((s for s, v in V.items() if v["prestige"] and v["famille"] == key), key=lambda s: V[s]["name"])
    for key in groups:
        if by_name(key):
            parts.append(f"- **{F[key]['name']}** : " + " · ".join(f"[{V[s]['name'].replace('Voie ', '')}](#{s})" for s in by_name(key)))
    parts.append("")
    for key in groups:
        if by_name(key):
            parts += [f'<a id="famille-{key}"></a>', f"## {F[key]['name']}", ""]
            parts += [voie_md(s, "###") for s in by_name(key)]
    docs["prestige.md"] = parts

    # ---------------- profils.md
    parts = ["# Profils", "", note,
             "Le texte complet des voies est dans [voies.md](voies.md). La famille d'un profil est la section où il se trouve.", ""]
    for fam in fams:
        parts += [f'<a id="famille-{fam}"></a>', f"## {F[fam]['name']}", ""]
        for p in profs[fam]:
            pr = P[p]
            parts += [f'<a id="{p}"></a>', f"### {pr['name']}", "", f"*{pr['desc']}*", "",
                      f"- **PV niveau 1** : {pr['pv1']} · **PV par niveau** : {pr['pvniv']} + CON · "
                      f"**Dé de récupération** : {pr['dr']} · **Points de chance** : {pr['pc']}",
                      f"- **DR au niveau 1** : {pr['drn']} · **Caractéristiques clés** : {pr['car'] or '—'} · "
                      f"**Caractéristique de magie** : {pr['magie'] or '—'}"]
            parts += [f"- {b}" for b in pr["bonus"]]
            parts += ["", "**Armes & armures.** " + pr["armes"], "", "**Équipement de départ.** " + pr["equipement"], ""]
            if pr.get("extra"):
                parts += ["> " + pr["extra"].replace("\n", "\n> "), ""]
            parts += ["**Voies :**", ""]
            parts += [f"- {link(s)} — {caps_summary(s)}" for s in pr["voies"]]
            parts.append("")
    docs["profils.md"] = parts

    # ---------------- familles.md
    parts = ["# Familles de profils", "", note,
             "La famille d'un profil se règle dans [profils.md](profils.md) ; les lignes **Particularité**, "
             "**Rang 2 dès le niveau 1** et **Voie remplaçant la voie de peuple** sont lues par la fiche. "
             "Les listes de profils et de voies sont un récapitulatif.", "",
             "| Famille | Profils | PV niv. 1 | PV / niveau | DR | PC | Particularité |", "|---|---|---|---|---|---|---|"]
    for fam in fams:
        pr = P[profs[fam][0]]
        parts.append(f"| {F[fam]['name']} | {', '.join(plink(p) for p in profs[fam])} | {pr['pv1']} | "
                     f"{pr['pvniv']} + CON | {pr['dr']} | {pr['pc']} | {F[fam]['note'] or '—'} |")
    parts += ["", "Rappels (livre de règles) : DR au niveau 1 = 2 + CON dés (+1 pour les mystiques) ; "
              "PV = PV niv. 1 puis + (PV / niveau) à chaque niveau.", ""]
    for key in groups:
        f = F[key]
        parts += [f'<a id="famille-{key}"></a>', f"## {f['name']}", ""]
        if f["note"]:
            parts += [f"**Particularité :** {f['note']}", ""]
        if f.get("r2niv1"):
            parts += ["**Rang 2 dès le niveau 1 :** oui", ""]
        if f.get("alt"):
            parts += [f"**Voie remplaçant la voie de peuple :** {link(f['alt'])}", ""]
        if profs.get(key):
            parts += ["**Profils :** " + ", ".join(plink(p) for p in profs[key]), "",
                      "**Voies de profil :** " + ", ".join(link(s) for p in profs[key] for s in P[p]["voies"]), ""]
        if by_name(key):
            parts += ["**Voies de prestige :** " + ", ".join(link(s, "prestige.md") for s in by_name(key)), ""]
    docs["familles.md"] = parts

    # ---------------- peuples.md
    parts = ["# Peuples", "", note,
             "Le texte complet des voies de peuple est dans [voies.md](voies.md#famille-peuple). "
             "Un peuple a une section « Caractéristiques » ; la ligne **Voie(s)** donne ses voies de peuple.", ""]
    for s, pe in PE.items():
        parts += [f'<a id="{s}"></a>', f"## {pe['name']}", "", pe["body"], "",
                  "**Voie(s) :** " + ", ".join(f"{link(v)} — {caps_summary(v)}" for v in pe["voies"]), ""]
    docs["peuples.md"] = parts

    return {name: "\n".join(p).strip() + "\n" for name, p in docs.items()}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--json", type=pathlib.Path, default=REF / "drs.json")
    ap.add_argument("--out", type=pathlib.Path, default=REF)
    ap.add_argument("--check", action="store_true", help="compare au lieu d'écrire (code de sortie 1 si différent)")
    args = ap.parse_args()
    docs = build(json.loads(args.json.read_text(encoding="utf-8")))
    diff = []
    for name, text in docs.items():
        path = args.out / name
        if args.check:
            if not path.is_file() or path.read_text(encoding="utf-8") != text:
                diff.append(name)
        else:
            path.write_text(text, encoding="utf-8", newline="\n")
            print("écrit", name, len(text))
    if args.check:
        print("identiques" if not diff else "différents : " + ", ".join(diff))
        sys.exit(1 if diff else 0)


if __name__ == "__main__":
    main()
