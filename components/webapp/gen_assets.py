"""Assemble l'appli web (www/) et la convertit en tableau C, compressé en gzip.

Chaque fichier servi (clé de bundles.json) est la concaténation de ses sources, dans l'ordre.
Appelé à la compilation par CMakeLists.txt ; pour voir le résultat sans compiler :

    python -I components/webapp/gen_assets.py --dist build/www
"""
import argparse
import gzip
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
}


def bundle(www, url, sources):
    ext = pathlib.Path(url).suffix
    parts = ["'use strict';\n"] if ext == ".js" else []
    for src in sources:
        text = (www / src).read_text(encoding="utf-8")
        if len(sources) > 1:
            parts.append(f"/* ===== {src} ===== */\n")
        parts.append(text if text.endswith("\n") else text + "\n")
    return "".join(parts).encode("utf-8")


def c_ident(url):
    return "s_" + re.sub(r"\W", "_", url)


def c_source(assets):
    out = ["/* Généré par components/webapp/gen_assets.py — ne pas modifier. */",
           '#include "webapp.h"', ""]
    for url, data in assets:
        out.append(f"static const uint8_t {c_ident(url)}[{len(data)}] = {{")
        for i in range(0, len(data), 20):
            out.append("    " + ",".join(f"0x{b:02x}" for b in data[i:i + 20]) + ",")
        out.append("};")
    out.append("")
    out.append("const webapp_asset_t webapp_assets[] = {")
    for url, data in assets:
        mime = MIME[pathlib.Path(url).suffix]
        out.append(f'    {{ "/{url}", "{mime}", {c_ident(url)}, sizeof({c_ident(url)}) }},')
    out.append("};")
    out.append(f"const size_t webapp_asset_count = {len(assets)};")
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--www", type=pathlib.Path, default=HERE / "www")
    ap.add_argument("--manifest", type=pathlib.Path, default=HERE / "bundles.json")
    ap.add_argument("--out", type=pathlib.Path, help="fichier C à générer")
    ap.add_argument("--dist", type=pathlib.Path, help="dossier où écrire les fichiers assemblés (non compressés)")
    args = ap.parse_args()

    manifest = {k: v for k, v in json.loads(args.manifest.read_text(encoding="utf-8")).items() if not k.startswith("_")}

    # Un fichier de www/ oublié dans bundles.json ne serait jamais servi : on le signale.
    listed = {src for sources in manifest.values() for src in sources}
    on_disk = {p.relative_to(args.www).as_posix() for p in args.www.rglob("*") if p.is_file()}
    for missing in sorted(listed - on_disk):
        sys.exit(f"gen_assets: {missing} est dans bundles.json mais absent de www/")
    for extra in sorted(on_disk - listed):
        sys.exit(f"gen_assets: www/{extra} n'est dans aucun bundle de bundles.json")

    assets = []
    for url, sources in manifest.items():
        if pathlib.Path(url).suffix not in MIME:
            sys.exit(f"gen_assets: type de fichier inconnu pour {url}")
        raw = bundle(args.www, url, sources)
        if args.dist:
            args.dist.mkdir(parents=True, exist_ok=True)
            (args.dist / url).write_bytes(raw)
        gz = gzip.compress(raw, 9, mtime=0)
        assets.append((url, gz))
        print(f"  /{url:<12} {len(raw):>7} octets -> {len(gz):>6} en gzip")

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(c_source(assets), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
