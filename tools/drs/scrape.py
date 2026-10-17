"""Rend chaque page du DRS avec Edge headless et sauvegarde le DOM final (une requête à la fois)."""
import subprocess, sys, time, pathlib
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE = "https://drs.chroniques-oubliees.fr/fantasy/"
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
slugs = pathlib.Path(sys.argv[2]).read_text(encoding="utf-8").split()
pages = [f"voies?page={i}" for i in range(1, 15)]
pages += ["profils/" + s for s in "arquebusier barbare barde chevalier druide ensorceleur forgesort guerrier magicien moine pretre rodeur sorcier voleur".split()]
pages += ["peuples/" + s for s in "demi-elfe demi-orc elfe-haut elfe-sylvain gnome halfelin humain mage nain".split()]
pages += ["voies/" + s for s in slugs]
for i, p in enumerate(pages, 1):
    f = out / (p.replace("/", "__").replace("?", "_") + ".html")
    if f.exists() and f.stat().st_size > 50000:
        continue
    for attempt in range(3):
        r = subprocess.run([EDGE, "--headless", "--disable-gpu", "--virtual-time-budget=8000", "--dump-dom", BASE + p],
                           capture_output=True, timeout=120)
        if len(r.stdout) > 50000:
            f.write_bytes(r.stdout); break
        time.sleep(3)
    print(f"{i}/{len(pages)} {p} {f.stat().st_size if f.exists() else 'ÉCHEC'}", flush=True)
    time.sleep(1)
print("TERMINÉ")
