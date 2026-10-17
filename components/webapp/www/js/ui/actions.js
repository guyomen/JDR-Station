/* Boutons : <… data-a="action"> → ACTIONS[action](élément, personnage). */

const ACTIONS = {
  tab(el) {
    S.tab = el.dataset.v;
    $$('[data-a=tab]').forEach(b => b.classList.toggle('on', b === el));
    $$('[data-pane]').forEach(p => p.classList.toggle('on', p.dataset.pane === S.tab));
  },
  mjtab(el) { S.mjtab = el.dataset.v; render(); },
  keep(el) {
    S.keep = el.dataset.v;
    $$('[data-a=keep]').forEach(b => b.classList.toggle('on', b.dataset.v === S.keep));
  },
  secret(el) { S.secret = el.checked; },
  adj(el, c) {
    const key = el.dataset.k;
    const k = calc(c);
    const v = Math.max(0, Math.min(k.max[key], curOf(c, key, k) + n(el.dataset.d)));
    change(c, key + '.cur', v, true);
    patchValues();
  },
  etat(el, c) {
    const e = el.dataset.v;
    const list = c.etats.includes(e) ? c.etats.filter(x => x !== e) : [...c.etats, e];
    change(c, 'etats', list, true);
    el.classList.toggle('on', list.includes(e));
  },
  capinfo(el) {
    const key = el.dataset.key;
    const open = !S.openCaps.has(key);
    if (open) S.openCaps.add(key); else S.openCaps.delete(key);
    el.classList.toggle('on', open);
    const box = el.parentElement.querySelector('.captext');
    if (box) box.hidden = !open;
  },
  rang(el, c) {
    const i = +el.dataset.i;
    const r = +el.dataset.r;
    const cur = n(c.voies[i].rang);
    change(c, `voies.${i}.rang`, cur === r ? r - 1 : r, true);
    render();
  },
  add(el, c) {
    const list = el.dataset.list;
    change(c, list, [...c[list], NEW_ITEM[list]()], true);
    render();
  },
  del(el, c) {
    const list = el.dataset.list;
    const i = +el.dataset.i;
    const item = c[list][i];
    const label = list === 'voies' ? voieNom(item) : list === 'armes' ? weaponOf(item).nom : item && item.nom;
    if (label && !confirm(`Supprimer « ${label} » ?`)) return;
    change(c, list, c[list].filter((_, j) => j !== i), true);
    render();
  },
  roll(el, c) {
    const [kind, ref] = el.dataset.roll.split(':');
    const k = calc(c);
    let f;
    if (kind === 'd20') f = { n: 1, f: 20, mod: ref[0] === '@' ? k[ref.slice(1)] : k.car[ref] };
    else if (kind === 'atk') f = { n: 1, f: 20, mod: weaponStats(c, c.armes[+ref], k).att };
    else if (kind === 'dm') f = parseFormula(weaponStats(c, c.armes[+ref], k).dm, c);
    if (!f) return toast('Formule de dés invalide (ex : 1d8+FOR)');
    doRoll(c.name || 'Sans nom', el.dataset.label, f);
  },
  die(el, c) {
    doRoll(rollerName(c), 'd' + el.dataset.f, { n: 1, f: +el.dataset.f, mod: 0 }, { secret: S.secret && !c });
  },
  forget(el, c) {
    if (!confirm('Retirer ce personnage de cet appareil ? (gardez le code de reprise)')) return;
    delete S.mine[c.id];
    save('mine', S.mine);
    sendPresence();
    location.hash = '#/joueur';
  },
  delete(el, c) {
    if (!confirm(`Supprimer définitivement ${c.name || 'ce personnage'} ?`)) return;
    send({ t: 'delete', id: c.id, ...authFor(c.id) });
  },
  screen() { setScreen(!S.screen); },
  setupscreen() { switchRole('ecran'); },
  role(el) { switchRole(el.dataset.v); },
  resetrole() {
    if (!confirm('Changer l’utilisateur de cet appareil ? Ses personnages restent accessibles avec leur code de reprise.')) return;
    switchRole('');
    S.mine = {};
    save('mine', S.mine);
    setPlayer('');
    location.hash = '#/';
    render();
  },
  screenon() { if (!S.screen) setScreen(true); location.hash = '#/global'; },
  fixbg() {
    setScreen(false);
    const d = $('#lieux details');
    if (d) d.open = true;
    if ($('#lieux')) $('#lieux').scrollIntoView();
  },
  imgdir() { pickImgs(true); },
  imgadd() { pickImgs(false); },
  imgclear() {
    if (!confirm('Effacer toutes les images de cet appareil ?')) return;
    IMG.clear().then(() => { S.imgDir = null; save('imgdir', null); refreshImgs(true); }, () => toast('Effacement impossible'));
  },
  imgdel(el) {
    if (!confirm(`Supprimer le lieu « ${lieuLabel(el.dataset.v)} » de cet appareil et de la station ?`)) return;
    IMG.del(el.dataset.v).then(() => refreshImgs(true), () => toast('Suppression impossible'));
  },
  'lieux-send'() { sendLieux(); },
  'bg-set'(el) { setBg(el.dataset.v); },
  'bg-clear'() { setBg(''); },
  'turn-next'() {
    const C = S.combat;
    const rows = initOrder(C.npcs);
    if (!rows.length) return;
    let i = rows.findIndex(r => r.key === C.turn.cur) + 1;
    if (i >= rows.length) { i = 0; C.turn.round++; }
    C.turn.cur = rows[i].key;
    pushCombat();
    render();
  },
  'turn-reset'() {
    S.combat.turn = { cur: curKey(initOrder(S.combat.npcs), ''), round: 1 };
    pushCombat();
    render();
  },
  'npc-del'(el) {
    S.combat.npcs = S.combat.npcs.filter(p => p.id !== el.dataset.n);
    pushCombat();
    render();
  },
  'npc-show'(el) {
    const p = npcById(el.dataset.n);
    if (p) p.show = !p.show;
    pushCombat();
    render();
  },
  'npc-allshow'(el) {
    const show = el.dataset.v === '1';
    S.combat.npcs.forEach(p => { p.show = show; });
    pushCombat();
    render();
  },
  'npc-etat'(el) {
    const p = npcById(el.dataset.n);
    if (!p) return;
    const e = el.dataset.v;
    p.etats = p.etats.includes(e) ? p.etats.filter(x => x !== e) : [...p.etats, e];
    pushCombat();
    render();
  },
  'npc-clear'() {
    if (!confirm('Retirer tous les PNJ et monstres ?')) return;
    S.combat.npcs = [];
    S.combat.turn = { cur: '', round: 1 };
    pushCombat();
    render();
  },
  'rest-full'() {
    if (!confirm('Récupération complète pour tout le groupe (+1 DR, PM au maximum) ?')) return;
    S.chars.forEach(c => {
      const k = calc(c);
      change(c, 'dr.cur', Math.min(k.max.dr, curOf(c, 'dr', k) + 1));
      change(c, 'pm.cur', k.max.pm);
    });
    flush();
    toast('Le groupe a récupéré');
  },
  export() {
    const data = JSON.stringify({ app: 'jdr-station', version: 2, date: new Date().toISOString(), chars: S.chars, tokens: S.tokens }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `jdr-station-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
  clearlog() { if (confirm('Vider le journal des dés ?')) send({ t: 'clearlog', pin: S.pin }); },
  mjlogout() { mjLogout(); location.hash = '#/'; },
};
