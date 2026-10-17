/* Formulaires : <form data-form="nom"> → FORMS[nom](données, formulaire). */

const FORMS = {
  create(d) {
    const c = blankChar();
    c.name = d.name.trim();
    c.player = (d.player || '').trim();
    c.peuple = d.peuple || '';
    c.profil = d.profil || '';
    if (!send({ t: 'create', char: c })) toast('Hors ligne');
  },
  claim(d) {
    const id = route()[1];
    send({ t: 'claim', id, token: d.code.trim().toUpperCase() });
  },
  bg(d) { setBg(d.bg); },
  login(d) { S.pin = d.pin; if (!send({ t: 'auth', pin: d.pin })) toast('Hors ligne'); },
  roll(d, form) {
    const c = charOf(form);
    const f = parseFormula(d.f, c);
    if (!f) return toast('Formule invalide (ex : 2d6+3)');
    S.lastF = d.f;
    doRoll(rollerName(c), d.f.toUpperCase(), f, { secret: S.secret && !c });
  },
  npc(d) {
    const C = S.combat;
    const qty = Math.max(1, Math.min(10, n(d.qty) || 1));
    for (let i = 1; i <= qty; i++) {
      C.npcs.push({
        id: 'n' + C.next++, kind: d.kind === 'pnj' ? 'pnj' : 'monstre', name: qty > 1 ? `${d.name} ${i}` : d.name,
        init: n(d.init), pv: n(d.pv), pvmax: n(d.pv), etats: [], show: !!d.show,
      });
    }
    pushCombat();
    render();
  },
  xp(d) {
    const gain = n(d.xp);
    if (!gain || !confirm(`Donner ${gain} XP à chaque personnage ?`)) return;
    S.chars.forEach(c => change(c, 'xp', n(c.xp) + gain));
    flush();
    toast(`${gain} XP distribués`);
  },
};

function importFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.chars)) throw new Error('format');
      if (!confirm(`Remplacer les personnages actuels par les ${data.chars.length} du fichier ?`)) return;
      send({ t: 'import', pin: S.pin, chars: data.chars, tokens: data.tokens || {} });
      toast('Import envoyé');
    } catch (err) {
      toast('Fichier invalide');
    }
  };
  reader.readAsText(file);
}
