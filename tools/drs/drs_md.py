"""Conversion du DOM rendu d'une page du DRS en texte Markdown balisé.

Balises émises (une par ligne) pour le découpage :
  @@TITLE <texte>      titre encadré (nom de voie sur les pages de profil)
  @@CAP <rang>|<nom>|<sort 0/1>   en-tête de capacité
  @@ACT <A|L|M|G>      type d'action de la capacité précédente
"""
import html
import re
from html.parser import HTMLParser

SKIP = {"script", "style", "noscript", "svg", "img", "header", "footer", "button", "nav"}
VOID = {"br", "hr", "img", "meta", "link", "input", "source", "wbr"}


class MD(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.stack = []          # (tag, mode)
        self.skip = 0
        self.cap = None          # capture d'en-tête de capacité en cours
        self.act = None
        self.title = None
        self.cell = None
        self.row = None
        self.list_depth = 0

    # -- utilitaires
    def emit(self, s):
        if self.cap is not None:
            self.cap.append(s)
        elif self.act is not None:
            self.act.append(s)
        elif self.title is not None:
            self.title.append(s)
        elif self.cell is not None:
            self.cell.append(s)
        else:
            self.out.append(s)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class") or ""
        mode = None
        if self.skip:
            if tag not in VOID:
                self.stack.append((tag, "skip"))
                self.skip += 1
            return
        if tag in SKIP or "sr-only" in cls and self.cap is None or a.get("id") == "cookie-consent":
            if tag not in VOID:
                self.stack.append((tag, "skip"))
                self.skip += 1
            return
        if tag == "div" and "font-semibold font-mendl-sans" in cls:
            self.cap = []
            mode = "cap"
        elif tag == "div" and "capability-type-spell-bg" in cls:
            self.out.append("\n@@SPELL\n")
        elif tag == "div" and "capability-type-bg" in cls:
            self.act = []
            mode = "act"
        elif tag == "div" and (a.get("style") or "").replace(" ", "") in ("padding:5px", "padding:5px;"):
            self.title = []
            mode = "title"
        elif tag == "span" and "sr-only" in cls and self.cap is not None:
            self.cap.append("\x01")  # marqueur de sort (l'astérisque masqué)
            mode = "srstar"
        elif tag in ("h1", "h2", "h3", "h4"):
            self.emit("\n\n" + "#" * (int(tag[1]) + 1) + " ")
        elif tag == "p":
            self.emit("\n\n")
        elif tag in ("ul", "ol"):
            self.list_depth += 1
        elif tag == "li":
            self.emit("\n" + "  " * (self.list_depth - 1) + "- ")
        elif tag in ("strong", "b"):
            self.emit("**")
        elif tag in ("em", "i"):
            self.emit("*")
        elif tag == "br":
            self.emit("\n")
        elif tag == "tr":
            self.row = []
        elif tag in ("td", "th"):
            self.cell = []
        elif tag == "table":
            self.emit("\n\n")
        if tag not in VOID:
            self.stack.append((tag, mode))

    def handle_endtag(self, tag):
        while self.stack:
            t, mode = self.stack.pop()
            if mode == "skip":
                self.skip -= 1
            elif mode == "cap":
                raw = "".join(self.cap)
                self.cap = None
                spell = "\x01" in raw
                raw = raw.replace("\x01", "").replace("*", "").replace("\xa0", " ").strip()
                m = re.match(r"(\d+)\s*·\s*(.+)", raw)
                if m:
                    self.out.append(f"\n@@CAP {m.group(1)}|{m.group(2).strip()}|{int(spell)}\n")
            elif mode == "act":
                v = "".join(self.act).strip()
                self.act = None
                if v:
                    self.out.append(f"\n@@ACT {v}\n")
            elif mode == "title":
                v = re.sub(r"\s+", " ", "".join(self.title)).strip()
                self.title = None
                if v:
                    self.out.append(f"\n@@TITLE {v}\n")
            elif not self.skip:
                if t in ("strong", "b"):
                    self.emit("**")
                elif t in ("em", "i"):
                    self.emit("*")
                elif t in ("ul", "ol"):
                    self.list_depth = max(0, self.list_depth - 1)
                    self.emit("\n")
                elif t in ("td", "th") and self.cell is not None:
                    c = re.sub(r"\s+", " ", "".join(self.cell)).strip()
                    self.cell = None
                    if self.row is not None:
                        self.row.append(c)
                elif t == "tr" and self.row is not None:
                    self.out.append("\n| " + " | ".join(self.row) + " |")
                    if not any(l.startswith("\n|") for l in self.out[-2:-1]):
                        self.out.append("\n|" + "---|" * len(self.row))
                    self.row = None
                elif t == "table":
                    self.out.append("\n\n")
            if t == tag:
                break

    def handle_data(self, data):
        if self.skip:
            return
        self.emit(data.replace("\xa0", " "))


def page_to_md(path):
    t = open(path, encoding="utf-8").read()
    m = re.search(r"<main.*?</main>", t, flags=re.S)
    p = MD()
    p.feed(m.group(0) if m else t)
    s = "".join(p.out)
    s = re.sub(r"\*\*\s*\*\*", "", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return html.unescape(s).strip()


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(page_to_md(sys.argv[1]))
