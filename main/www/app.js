'use strict';
/* Données de jeu : COF2 (cof2.js) + COF2_DRS (cof2_drs.js, généré depuis le DRS), chargés avant ce fichier. */

/* Fusion : voies, peuples et textes des profils viennent du DRS. */
COF2.voies = Object.fromEntries(Object.entries(COF2_DRS.voies).map(([id, [n, f, prestige, intro, caps]]) => [id, {
  n, f, prestige: !!prestige, intro, fx: COF2.fx[id],
  caps: caps.map(([name, spell, act, text]) => ({ name, spell: !!spell, act, text })),
}]));
COF2.peuples = Object.fromEntries(Object.entries(COF2_DRS.peuples).filter(([id]) => id !== 'mage')
  .map(([id, p]) => [id, { n: p.n, mod: p.m, voies: p.v }]));
for (const [id, p] of Object.entries(COF2.profils)) {
  const d = COF2_DRS.profils[id] || {};
  Object.assign(p, { desc: d.d || '', armes: d.a || '', equip: d.e || '', extra: d.x || '', bonus: d.b || [], voies: d.v || [] });
}
const FAM_LABEL = { aventurier: 'Aventuriers', combattant: 'Combattants', mage: 'Mages', mystique: 'Mystiques', generique: 'Génériques' };
const PRESTIGE_NIV = [5, 7, 9, 11, 13];

const CARACS = [
  ['AGI', 'Agilité'], ['CON', 'Constitution'], ['FOR', 'Force'], ['PER', 'Perception'],
  ['CHA', 'Charisme'], ['INT', 'Intelligence'], ['VOL', 'Volonté'],
];
const DERIVED = [
  ['def', 'DEF', 'Défense'], ['init', 'Init', 'Initiative'], ['contact', 'Contact', 'Attaque au contact'],
  ['distance', 'Dist.', 'Attaque à distance'], ['magique', 'Magie', 'Attaque magique'],
];
const RES = [['pv', 'PV', 'Points de vigueur'], ['dr', 'DR', 'Dés de récupération'], ['pc', 'PC', 'Points de chance'], ['pm', 'PM', 'Points de mana']];
const DIVERS = [['def', 'DEF'], ['init', 'Init'], ['contact', 'Contact'], ['distance', 'Distance'], ['magique', 'Magie'], ['pv', 'PV max'], ['dr', 'DR max'], ['pc', 'PC max'], ['pm', 'PM max']];
const ATTACKS = [['contact', 'Contact'], ['distance', 'Distance'], ['magique', 'Magique']];
const MAX_VOIES = 6;

const n = v => (Number.isFinite(+v) ? +v : 0);
const WEAPONS = Object.fromEntries(COF2.armes.map(([id, nom, att, dm, o]) => [id, { id, nom, att, dm, ...(o || {}) }]));
const ARMURES = Object.fromEntries(COF2.armures.map(([id, nom, def, agi]) => [id, { nom, def, agi }]));
const BOUCLIERS = Object.fromEntries(COF2.boucliers.map(([id, nom, def]) => [id, { nom, def }]));
const ETAT_INFO = Object.fromEntries(COF2.etats);

function blankChar() {
  return {
    name: '', player: '', peuple: '', profil: '', niveau: 1, xp: 0, ideal: '', travers: '',
    car: Object.fromEntries(CARACS.map(([k]) => [k, 0])),
    pv: { cur: null }, dr: { cur: null }, pc: { cur: null }, pm: { cur: null }, // null = plein
    div: Object.fromEntries(DIVERS.map(([k]) => [k, 0])),
    armure: '', bouclier: '', armes: [], inventaire: [], bourse: { po: 0, pa: 0, pc: 0 },
    voies: [], etats: [], notes: '',
  };
}
const NEW_ITEM = {
  armes: () => ({ id: 'dague', bonus: 0 }),
  inventaire: () => ({ nom: '', qte: 1, notes: '' }),
};

/* ===================== Calculs COF2 ===================== */
const famille = c => {
  const p = COF2.profils[c.profil];
  return p ? COF2.familles[p.f] : null;
};
const DEFAULT_FAM = { pv: 4, dr: 8, pc: 0, drb: 0 };

/* Toutes les valeurs dérivées d'une fiche (caractéristiques effectives, maxima, attaques…). */
function calc(c) {
  const car = Object.fromEntries(CARACS.map(([k]) => [k, n(c.car[k])]));
  const fx = { def: 0, init: 0, pv: 0, pm: 0, pc: 0, dr: 0 };
  let sorts = 0, pmcar = 'VOL';
  const acquired = [];
  for (const v of c.voies) {
    const d = COF2.voies[v.id];
    if (!d) continue;
    const vfx = variante(v) && 'fx' in variante(v) ? variante(v).fx : d.fx;
    for (let r = 1; r <= Math.min(5, n(v.rang)); r++) {
      if (d.caps[r - 1].spell) sorts++;
      if (vfx && vfx[r]) acquired.push({ ...vfx[r], src: d.caps[r - 1].name });
    }
  }
  for (const e of acquired) {
    if (e.car) for (const k in e.car) car[k] += e.car[k];
    if (e.pmcar) pmcar = e.pmcar;
  }
  const val = v => (typeof v === 'string' ? car[v] : n(v));
  const arme = [];
  for (const e of acquired) {
    for (const k in fx) if (e[k] != null) fx[k] += val(e[k]);
    for (const cat in e.arme || {}) {
      const b = e.arme[cat];
      arme.push({ cat, src: e.src, att: val(b.att), dm: val(b.dm), crit: n(b.crit), portee: n(b.portee) || 1 });
    }
  }
  const f = famille(c) || DEFAULT_FAM;
  const niv = Math.max(1, n(c.niveau));
  const atk = Math.min(niv, 10);
  const arm = ARMURES[c.armure] || ARMURES[''];
  const bou = BOUCLIERS[c.bouclier] || BOUCLIERS[''];
  const div = c.div;
  const prof = COF2.profils[c.profil];
  return {
    car, sorts, arme, fam: famille(c), drType: f.dr,
    lanceur: !!(prof && prof.magie) || sorts > 0 || fx.pm > 0 || n(div.pm) > 0,
    agiCap: Math.min(car.AGI, arm.agi),
    max: {
      pv: Math.max(1, (niv + 1) * f.pv + niv * car.CON + fx.pv + n(div.pv)),
      dr: Math.max(0, 2 + car.CON + f.drb + fx.dr + n(div.dr)),
      pc: Math.max(0, 2 + car.CHA + f.pc + fx.pc + n(div.pc)),
      pm: Math.max(0, (sorts ? car[pmcar] + sorts : 0) + fx.pm + n(div.pm)),
    },
    def: 10 + Math.min(car.AGI, arm.agi) + arm.def + bou.def + fx.def + n(div.def),
    init: 10 + car.PER + fx.init + n(div.init),
    contact: atk + car.FOR + n(div.contact),
    distance: atk + car.AGI + n(div.distance),
    magique: atk + car.VOL + n(div.magique),
  };
}
/* Variante choisie pour une voie (COF2.variantes), ou null pour la version standard. */
const variante = v => { const vs = COF2.variantes[v.id]; return (vs && v.variante && typeof vs[v.variante] === 'object' && vs[v.variante]) || null; };
const voieNom = v => (variante(v) && variante(v).v) || voieDef(v).n;
const curOf = (c, k, k2 = calc(c)) => (c[k].cur == null ? k2.max[k] : n(c[k].cur));

function weaponOf(w) {
  if (w.id === 'autre' || !WEAPONS[w.id]) return { nom: w.nom || 'Arme', att: w.att || 'contact', dm: w.dm || '1d6', note: '', custom: true };
  return WEAPONS[w.id];
}
/* Bonus saisi à la main : nombres et caractéristiques (« PER », « 2 », « AGI+1 »…) ; null si illisible. */
function bonusOf(s, k, c) {
  const str = String(s || '').toUpperCase().replace(/\s+/g, '');
  if (!/^([+-]?(\d+|[A-Z]{3}))*$/.test(str)) return null;
  let t = 0;
  for (const [, sign, tok] of str.matchAll(/([+-]?)(\d+|[A-Z]{3})/g)) {
    const v = /^\d+$/.test(tok) ? +tok : tok in k.car ? k.car[tok] : tok === 'NIV' ? n(c.niveau) : null;
    if (v == null) return null;
    t += sign === '-' ? -v : v;
  }
  return t;
}
function weaponStats(c, w, k = calc(c)) {
  const W = weaponOf(w);
  const bonus = n(w.bonus);
  let att = (k[W.att] != null ? k[W.att] : k.contact) + bonus + n(w.batt);
  const bdm = bonusOf(w.bdm, k, c);
  let mod = bonus + (bdm || 0);
  let crit = W.crit || 20;
  let portee = W.portee;
  if (W.att === 'contact' && !W.nofor && !W.custom) mod += k.car.FOR;
  /* Bonus des capacités de voie liés à la catégorie d'arme (Archer émérite, Haches et marteaux…). */
  const cats = [W.att, ...String(W.cat || '').split(' ')];
  const src = bdm == null ? ['bonus DM illisible (ex. PER, 2, AGI+1)'] : [];
  for (const b of k.arme) {
    if (!cats.includes(b.cat)) continue;
    att += b.att;
    mod += b.dm;
    crit -= b.crit;
    if (portee) portee *= b.portee;
    src.push([b.src, b.att && `${sgn(b.att)} att.`, b.dm && `${sgn(b.dm)} DM`, b.crit && `crit. +${b.crit}`, b.portee > 1 && `portée ×${b.portee}`].filter(Boolean).join(' '));
  }
  const dm = W.dm + (mod ? sgn(mod) : '');
  return { W, att, dm, crit, portee, src };
}
const wstatHTML = st => {
  const info = [st.portee ? `portée ${st.portee} m` : '', st.crit < 20 ? `critique ${st.crit}-20` : '', st.W.note, ...st.src].filter(Boolean).join(' · ');
  return `<b>${sgn(st.att)}</b> attaque · <b>${esc(st.dm)}</b> DM${info ? ` <span class="muted small">· ${esc(info)}</span>` : ''}`;
};

/* ===================== Utilitaires ===================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const sgn = v => (v >= 0 ? '+' : '') + v;
/* Petit rendu Markdown des textes du DRS : gras, italique, listes, tableaux, paragraphes. */
function md(s) {
  const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  const out = [];
  let list = false;
  let table = false;
  for (const line of String(s || '').split('\n')) {
    const li = line.match(/^\s*- (.*)/);
    const tr = line.match(/^\|(.*)\|\s*$/);
    if (list && !li) { out.push('</ul>'); list = false; }
    if (table && !tr) { out.push('</table>'); table = false; }
    if (li) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(li[1])}</li>`); }
    else if (tr) {
      if (/^[\s|:-]+$/.test(tr[1])) continue;
      if (!table) { out.push('<table>'); table = true; }
      out.push('<tr>' + tr[1].split('|').map(c => `<td>${inline(c.trim())}</td>`).join('') + '</tr>');
    } else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push('</ul>');
  if (table) out.push('</table>');
  return out.join('');
}
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPath(o, p, v) {
  const ks = p.split('.');
  let a = o;
  for (let i = 0; i < ks.length - 1; i++) {
    if (a[ks[i]] == null || typeof a[ks[i]] !== 'object') a[ks[i]] = {};
    a = a[ks[i]];
  }
  a[ks[ks.length - 1]] = v;
}
function merge(d, s) {
  if (Array.isArray(d)) return Array.isArray(s) ? s : d;
  if (d && typeof d === 'object') {
    const o = Object.assign({}, s && typeof s === 'object' ? s : {});
    for (const k in d) o[k] = merge(d[k], o[k]);
    return o;
  }
  return s === undefined || s === null ? d : s;
}
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function findId(table, val) {
  if (typeof val !== 'string' || !val) return '';
  if (table[val]) return val;
  const f = fold(val);
  return Object.keys(table).find(id => fold(table[id].n || table[id].nom) === f) || '';
}
/* Retrouve une voie par son nom, avec ou sans « Voie de la / du … ». */
const bareVoie = s => fold(s).replace(/^voie (de la |de l'|de l’|du |des |de |d')/, '');
function voieByName(name) {
  const f = bareVoie(name);
  return f ? Object.keys(COF2.voies).find(id => bareVoie(COF2.voies[id].n) === f) || '' : '';
}
function migrateVoie(v) {
  let id = v.id ? COF2.legacy[v.id] || v.id : voieByName(v.nom);
  if (id && id.startsWith('p:')) id = voieByName(id.slice(2));
  return { ...v, id: COF2.voies[id] ? id : 'libre', nom: v.nom || (v.id && v.id.startsWith('p:') ? v.id.slice(2) : ''), notes: v.notes || v.cap || '' };
}
/* Complète une fiche reçue et convertit les fiches des versions précédentes. */
function norm(raw) {
  const c = merge(blankChar(), raw);
  c.peuple = findId(COF2.peuples, COF2.legacy[c.peuple] || c.peuple);
  c.profil = findId(COF2.profils, c.profil);
  if (typeof c.armure !== 'string') c.armure = findId(ARMURES, c.armure && c.armure.nom);
  if (typeof c.bouclier !== 'string') c.bouclier = n(c.bouclier && c.bouclier.def) >= 2 ? 'grand' : n(c.bouclier && c.bouclier.def) ? 'petit' : '';
  c.armes = c.armes.map(w => (w.id ? w : { id: 'autre', nom: w.nom, att: w.att, dm: w.dm }));
  c.voies = c.voies.map(migrateVoie);
  return c;
}
function load(k, d) { try { const v = localStorage.getItem('jdr.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem('jdr.' + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ===================== Combat : PNJ, monstres et initiative ===================== */
const KIND = { monstre: '👹', pnj: '👤' };
const HP = { g: 'En forme', y: 'Blessé', r: 'Gravement blessé' };
/* Santé en couleur : rouge sous 1/3 des PV, jaune sous 2/3, vert au-delà. */
function hpLevel(pv, max) {
  if (!(max > 0)) return '';
  const r = pv / max;
  return r < 1 / 3 ? 'r' : r < 2 / 3 ? 'y' : 'g';
}
function normCombat(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const t = o.turn || {};
  return {
    npcs: (Array.isArray(o.npcs) ? o.npcs : []).map(p => ({
      id: String(p.id), kind: p.kind === 'pnj' ? 'pnj' : 'monstre', name: String(p.name || ''), init: n(p.init),
      pv: n(p.pv), pvmax: n(p.pvmax), etats: Array.isArray(p.etats) ? p.etats : [], show: !!p.show, hp: p.hp || '',
    })),
    turn: { cur: t.cur || '', round: n(t.round) || 1 },
    next: n(o.next) || 1,
    bg: imgId(o.bg),               // lieu affiché en fond de l'écran partagé (ID d'une image locale à l'écran)
  };
}
/* Ordre d'initiative (PJ + PNJ), du plus haut au plus bas ; à égalité, les PJ d'abord. */
function initOrder(npcs) {
  return [
    ...S.chars.map(c => ({ key: 'c:' + c.id, c, init: calc(c).init, pj: true })),
    ...npcs.map(p => ({ key: 'n:' + p.id, p, init: n(p.init), pj: false })),
  ].sort((a, b) => b.init - a.init || b.pj - a.pj);
}
const curKey = (rows, cur) => (rows.some(r => r.key === cur) ? cur : rows.length ? rows[0].key : '');
const npcById = id => S.combat.npcs.find(p => p.id === id);

/* Le MJ envoie la version complète et la version publique (PNJ visibles, sans les PV). */
let combatT;
function pushCombat() {
  const C = S.combat;
  C.turn.cur = curKey(initOrder(C.npcs), C.turn.cur);
  const vis = C.npcs.filter(p => p.show);
  const cur = C.turn.cur.startsWith('n:') && !vis.some(p => 'n:' + p.id === C.turn.cur) ? '' : C.turn.cur;
  S.pub = normCombat({
    npcs: vis.map(p => ({ id: p.id, kind: p.kind, name: p.name, init: p.init, etats: p.etats, hp: hpLevel(p.pv, p.pvmax) })),
    turn: { cur, round: C.turn.round },
    bg: C.bg,
  });
  S.combatDirty = true;
  clearTimeout(combatT);
  combatT = setTimeout(flushCombat, 300);
}
function flushCombat() {
  if (!S.combatDirty) return;
  const pub = { npcs: S.pub.npcs.map(({ id, kind, name, init, etats, hp }) => ({ id, kind, name, init, etats, hp })), turn: S.pub.turn, bg: S.pub.bg };
  if (send({ t: 'combat', pin: S.pin, full: S.combat, pub })) S.combatDirty = false;
}

/* ===================== État ===================== */
const S = {
  ready: false, chars: [], log: [], clock: Date.now(),
  mine: load('mine', {}),          // id -> code de reprise (personnages de cet appareil)
  pin: load('pin', ''), isMJ: false, tokens: {},
  pending: {},                     // id -> { chemin: valeur } en attente d'envoi
  tab: 'perso', mjtab: 'groupe', keep: '', secret: false, lastRq: '', lastF: '',
  combat: normCombat({}),          // initiative complète (MJ) : PNJ avec PV, tour en cours
  pub: normCombat({}),             // version publique diffusée par la station
  combatDirty: false,
  screen: load('screen', false),   // mode écran partagé (espace global plein écran)
  openCaps: new Set(),             // descriptions de capacités dépliées
  needRender: false, ws: null,
  peers: [], me: -1,               // appareils connectés (cf. presence), dont celui-ci
  imgs: [], thumbs: {}, imgErr: false, // images de lieux de cet appareil, miniatures, stockage local indisponible
  imgDir: load('imgdir', null),    // dossier d'images synchronisé : { name, n, at }
};
const byId = id => S.chars.find(c => c.id === id);

/* ===================== Connexion WebSocket ===================== */
function connect() {
  if (S.ws && S.ws.readyState <= 1) return;
  const ws = new WebSocket(`ws://${location.host}/ws`);
  S.ws = ws;
  ws.onopen = () => {
    $('#net').classList.add('on');
    send({ t: 'hello' });
    if (S.pin) send({ t: 'auth', pin: S.pin });
    sendPresence();
    flush();
    if (S.pin) flushCombat();
  };
  ws.onclose = () => {
    $('#net').classList.remove('on');
    setTimeout(connect, 1500);
  };
  ws.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch (err) { console.error(err); } };
}
function send(o) {
  if (S.ws && S.ws.readyState === 1) { S.ws.send(JSON.stringify(o)); return true; }
  return false;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) connect(); });

/* Type d'appareil affiché dans l'espace global. */
function deviceName() {
  const ua = navigator.userAgent;
  return /iPad/.test(ua) ? 'iPad' : /iPhone|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android' : 'Tablette')
    : /Windows/.test(ua) ? 'PC' : /Mac/.test(ua) ? 'Mac' : /Linux|CrOS/.test(ua) ? 'Ordinateur' : 'Appareil';
}
/* Annonce à la station qui est derrière cet appareil (à refaire quand S.mine ou le rôle MJ change). */
const sendPresence = () => send({ t: 'presence', dev: deviceName(), mine: S.mine, ...(S.pin ? { pin: S.pin } : {}), ...(S.screen ? { imgs: S.imgs } : {}) });

const authFor = id => (S.isMJ ? { pin: S.pin } : { token: S.mine[id] });

/* Modifications locales : regroupées puis envoyées sous forme de « patch ». */
let flushT;
function queue(id, path, value) {
  const p = (S.pending[id] = S.pending[id] || {});
  for (const k of Object.keys(p)) if (k.startsWith(path + '.')) delete p[k];
  p[path] = value;
  clearTimeout(flushT);
  flushT = setTimeout(flush, 350);
}
function flush() {
  for (const id of Object.keys(S.pending)) {
    if (!send({ t: 'patch', id, set: S.pending[id], ...authFor(id) })) return;
    delete S.pending[id];
  }
}
function change(c, path, value, now) {
  setPath(c, path, value);
  queue(c.id, path, value);
  if (now) flush();
}

function onMsg(m) {
  switch (m.t) {
    case 'state':
      S.ready = true;
      S.clock = Date.now() - m.now;
      S.chars = m.chars.map(norm);
      S.log = m.log || [];
      S.peers = m.peers || [];
      if (!S.isMJ) S.pub = normCombat(m.combat);
      peersChanged();
      update();
      break;
    case 'char': {
      const c = norm(m.char);
      const pend = S.pending[c.id];
      if (pend) for (const p in pend) setPath(c, p, pend[p]);
      const i = S.chars.findIndex(x => x.id === c.id);
      if (i >= 0) S.chars[i] = c; else S.chars.push(c);
      if (i < 0 && S.isMJ) send({ t: 'auth', pin: S.pin }); // rafraîchit les codes
      update();
      break;
    }
    case 'del': {
      S.chars = S.chars.filter(c => c.id !== m.id);
      const r = route();
      if ((r[0] === 'c' && r[1] === m.id) || (r[2] === m.id)) location.hash = r[0] === 'mj' ? '#/mj' : '#/joueur';
      update();
      break;
    }
    case 'log':
      S.log.push(m.e);
      if (S.log.length > 80) S.log.shift();
      if (m.e.rq && m.e.rq === S.lastRq) showRoll(m.e);
      $$('[data-log]').forEach(el => { el.innerHTML = logHTML(); });
      break;
    case 'auth':
      if (m.ok !== S.isMJ) sendPresence();
      S.isMJ = m.ok;
      if (m.ok) {
        S.tokens = m.tokens || {};
        save('pin', S.pin);
        if (!S.combatDirty) { S.combat = normCombat(m.combat); migrateNpcs(); }
      }
      else if (S.pin) { toast('Code MJ incorrect'); S.pin = ''; save('pin', ''); }
      update();
      break;
    case 'peers':
      S.peers = m.list || [];
      peersChanged();
      break;
    case 'combat':
      if (S.isMJ) break; // le MJ a déjà la version complète
      S.pub = normCombat(m.combat);
      if (route()[0] === 'global') update();
      break;
    case 'you':
      S.me = m.id;
      peersChanged();
      break;
    case 'created':
      S.mine[m.id] = m.token;
      save('mine', S.mine);
      sendPresence();
      S.tab = 'perso';
      location.hash = '#/c/' + m.id;
      break;
    case 'claim':
      if (m.ok) { S.mine[m.id] = m.token; save('mine', S.mine); sendPresence(); toast('Personnage récupéré !'); update(); }
      else toast('Code incorrect');
      break;
    case 'err':
      toast(m.m);
      break;
  }
}

/* Seul l'espace global affiche les connectés : inutile de re-rendre les autres pages. */
function peersChanged() {
  const b = $('#peers');
  if (b) b.textContent = S.peers.length || '';
  if (['global', undefined].includes(route()[0])) update();
}

/* ===================== Rendu ===================== */
const route = () => (location.hash.slice(1) || '/').split('/').filter(Boolean);
const isEditing = () => {
  const a = document.activeElement;
  return a && a.closest('#app') && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.type !== 'checkbox' && a.type !== 'file';
};

/* Ne jamais casser une saisie en cours : on patche les valeurs et on re-rend plus tard. */
function update() {
  if (isEditing()) { patchValues(); S.needRender = true; } else render();
}
document.addEventListener('focusout', () => setTimeout(() => { if (S.needRender && !isEditing()) render(); }, 60));
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

function render() {
  S.needRender = false;
  const app = $('#app');
  const open = $$('details[open][data-k]', app).map(d => d.dataset.k);
  const r = route();
  let html;
  if (!S.ready) html = '<p class="muted center">Connexion à la station…</p>';
  else if (r[0] === 'c') html = viewSheet(r[1], false);
  else if (r[0] === 'global') html = viewGlobal();
  else if (r[0] === 'config') html = viewConfig();
  else if (r[0] === 'joueur') html = viewPlayer();
  else if (r[0] === 'mj' && !S.isMJ) html = viewLogin();
  else if (r[0] === 'mj' && r[1] === 'c') html = viewSheet(r[2], true);
  else if (r[0] === 'mj') html = viewMJ();
  else html = viewHome();
  document.documentElement.classList.toggle('screen', S.screen && r[0] === 'global');
  app.innerHTML = html;
  open.forEach(k => { const d = $(`details[data-k="${k}"]`, app); if (d) d.open = true; });
  refreshCalc();
  showBg();
}

function patchValues() {
  $$('[data-id]', $('#app')).forEach(scope => {
    const c = byId(scope.dataset.id);
    if (!c) return;
    const k = calc(c);
    $$('[data-p]', scope).forEach(el => {
      if (el === document.activeElement || el.closest('[data-id]') !== scope) return;
      const p = el.dataset.p;
      const v = /^(pv|dr|pc|pm)\.cur$/.test(p) ? curOf(c, p.slice(0, 2), k) : get(c, p);
      if (v !== undefined && v !== null && String(el.value) !== String(v)) el.value = v;
    });
    $$('[data-a=etat]', scope).forEach(b => b.classList.toggle('on', c.etats.includes(b.dataset.v)));
  });
  refreshCalc();
}

/* Valeurs calculées (DEF, attaques, maxima, barres) mises à jour sans re-rendu. */
function refreshCalc() {
  $$('[data-id]', $('#app')).forEach(scope => {
    const c = byId(scope.dataset.id);
    if (!c) return;
    const k = calc(c);
    $$('[data-calc]', scope).forEach(el => {
      if (el.closest('[data-id]') !== scope) return;
      const key = el.dataset.calc;
      let v;
      if (key === 'name') v = c.name || 'Sans nom';
      else if (key === 'def' || key === 'init') v = k[key];
      else if (key in k && typeof k[key] === 'number') v = sgn(k[key]);
      else if (key.startsWith('max.')) v = k.max[key.slice(4)];
      else if (key.startsWith('car.')) { const ck = key.slice(4); v = k.car[ck] !== n(c.car[ck]) ? `→ ${sgn(k.car[ck])}` : ''; }
      else if (key === 'drtype') v = 'd' + k.drType;
      else if (key === 'sorts') v = k.sorts;
      else if (key.startsWith('arme.')) { const w = c.armes[+key.slice(5)]; if (w) el.innerHTML = wstatHTML(weaponStats(c, w, k)); }
      if (v !== undefined) el.textContent = v;
    });
    $$('[data-bar]', scope).forEach(el => {
      const r = el.dataset.bar;
      const max = k.max[r];
      const pct = max > 0 ? Math.max(0, Math.min(100, (100 * curOf(c, r, k)) / max)) : 0;
      el.style.width = pct + '%';
      el.classList.toggle('low', r === 'pv' && pct <= 25);
    });
    $$('[data-res=pm]', scope).forEach(el => { if (el.closest('[data-id]') === scope) el.hidden = !k.lanceur; });
  });
}

/* Liste déroulante : options [valeur, libellé] ou groupes { 'Groupe': [[valeur, libellé]…] }. */
function selectHTML(p, value, options, attrs = '') {
  const opt = ([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`;
  const body = Array.isArray(options) ? options.map(opt).join('')
    : Object.entries(options).filter(([, o]) => o.length).map(([g, o]) => `<optgroup label="${esc(g)}">${o.map(opt).join('')}</optgroup>`).join('');
  return `<select${p ? ` data-p="${p}"` : ''}${attrs}>${body}</select>`;
}
const PEUPLE_OPTS = [['', '— Peuple —'], ...Object.entries(COF2.peuples).map(([id, p]) => [id, p.n])];
const PROFIL_OPTS = (() => {
  const g = {};
  for (const [id, p] of Object.entries(COF2.profils)) (g[COF2.familles[p.f].n] = g[COF2.familles[p.f].n] || []).push([id, p.n]);
  return { '': [['', '— Profil —']], ...g };
})();

/* ---------- Accueil ---------- */
function viewHome() {
  const mine = S.chars.filter(c => S.mine[c.id]).length;
  const tile = (href, icon, title, desc) => `<a class="tile card" href="${href}"><span class="ico">${icon}</span>
    <span class="grow"><b>${title}</b><small>${desc}</small></span><span class="go">›</span></a>`;
  return `<div class="tiles">
    ${tile('#/joueur', '🧝', 'Espace joueur', mine ? `${mine} personnage${mine > 1 ? 's' : ''} sur cet appareil` : 'Créer ou reprendre son personnage')}
    ${tile('#/global', '👥', 'Espace global', `${S.peers.length} connecté${S.peers.length > 1 ? 's' : ''} · état du groupe`)}
    ${tile('#/mj', '🎲', 'Espace MJ', S.isMJ ? 'Connecté en MJ' : 'Réservé au meneur de jeu')}
    ${tile('#/config', '⚙', 'Réglages de cet appareil', S.imgs.length ? `${S.imgs.length} image${S.imgs.length > 1 ? 's' : ''} de lieux` : 'Dossier d’images pour l’écran partagé')}
  </div>`;
}

/* ---------- Réglages propres à cet appareil (rien n'est stocké sur la station) ---------- */
function viewConfig() {
  const bg = curBg();
  const d = S.imgDir;
  const when = d && new Date(d.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  return `<div class="sheet-head"><a class="back" href="#/">‹</a><h1>Réglages de cet appareil</h1></div>
  <section class="card">
    <h2>Images de lieux <span class="badge">${S.imgs.length}</span></h2>
    <p class="muted small">Pour l’écran partagé : le MJ choisit un lieu par son ID, cet appareil affiche l’image correspondante en fond.
      L’ID est le nom du fichier sans extension (« Ville.jpg » → <span class="code small">ville</span>).
      Les images sont copiées dans le navigateur de cet appareil, jamais sur la station : après avoir modifié le dossier, resynchronisez-le.</p>
    ${d ? `<p>📁 <b>${esc(d.name)}</b> <small class="muted">· ${d.n} image${d.n > 1 ? 's' : ''} · synchronisé le ${esc(when)}</small></p>` : ''}
    <div class="row">
      <button class="btn" data-a="imgdir">📁 ${d ? 'Resynchroniser le dossier' : 'Choisir le dossier d’images'}</button>
      <button data-a="imgadd">＋ Ajouter des fichiers</button>
      ${S.imgs.length ? '<button class="danger" data-a="imgclear">Tout effacer</button>' : ''}
    </div>
    ${bg && !S.imgs.includes(bg) ? `<p class="small">⚠ Le MJ a choisi « ${esc(bg)} », absent de cet appareil.</p>` : ''}
    ${S.imgs.length ? `<div class="thumbs">${S.imgs.map(id => `<figure class="thumb${id === bg ? ' on' : ''}">
        ${S.thumbs[id] ? `<img src="${S.thumbs[id]}" alt="">` : '<span class="noimg">?</span>'}
        <figcaption><span class="code small">${esc(id)}</span><button class="x" data-a="imgdel" data-v="${esc(id)}" title="Supprimer">✕</button></figcaption>
      </figure>`).join('')}</div>`
      : `<p class="muted">${S.imgErr ? '⚠ Stockage local indisponible dans ce navigateur (navigation privée ?).' : 'Aucune image sur cet appareil.'}</p>`}
  </section>
  <section class="card">
    <h2>Écran partagé</h2>
    <p class="muted small">Affiche l’espace global en plein écran pour toute la table, avec le lieu choisi par le MJ en fond.</p>
    <div class="row"><button class="btn" data-a="screenon">📺 ${S.screen ? 'Reprendre le' : 'Passer en'} mode écran</button></div>
  </section>`;
}

/* ---------- Espace joueur : ses personnages, création, reprise ---------- */
function viewPlayer() {
  const item = c => {
    const k = calc(c);
    const sub = [COF2.profils[c.profil] && COF2.profils[c.profil].n, COF2.peuples[c.peuple] && COF2.peuples[c.peuple].n].filter(Boolean).join(' · ') || '—';
    return `<a class="item" href="#/c/${c.id}">
      <b>${esc(c.name || 'Sans nom')}</b>
      <small>${esc(sub)} · niv. ${esc(c.niveau)}</small>
      <span class="badge">${curOf(c, 'pv', k)}/${k.max.pv} PV</span></a>`;
  };
  const mine = S.chars.filter(c => S.mine[c.id]);
  const others = S.chars.filter(c => !S.mine[c.id]);
  return `
  <div class="sheet-head"><a class="back" href="#/">‹</a><h1>Espace joueur</h1></div>
  <section class="card">
    <h2>Mes personnages</h2>
    ${mine.length ? `<div class="list">${mine.map(item).join('')}</div>` : '<p class="muted">Aucun personnage sur cet appareil pour l’instant.</p>'}
    <h3>Nouveau personnage</h3>
    <form class="col" data-form="create">
      <div class="grid2">
        <input name="name" placeholder="Nom du personnage" maxlength="40" required>
        <input name="player" placeholder="Joueur / joueuse" maxlength="30">
        ${selectHTML('', '', PEUPLE_OPTS, ' name="peuple"')}
        ${selectHTML('', '', PROFIL_OPTS, ' name="profil"')}
      </div>
      <button class="btn">Créer</button>
    </form>
  </section>
  ${others.length ? `<section class="card"><h2>Autres personnages</h2><div class="list">${others.map(item).join('')}</div>
    <p class="muted small">Changement de téléphone ? Ouvrez votre personnage et saisissez son code de reprise.</p></section>` : ''}`;
}

/* ---------- Espace global : qui est connecté, état du groupe ---------- */
function viewGlobal() {
  const scr = S.screen; // écran partagé : lecture à distance, pas de navigation
  const mins = ts => Math.max(0, Math.round((Date.now() - S.clock - ts) / 60000));
  const live = id => !!byId(id);
  const sheet = c => (S.isMJ ? '#/mj/c/' : '#/c/') + c.id;
  const online = new Set(S.peers.filter(p => !p.mj).flatMap(p => p.chars.filter(live)));
  const peerWho = p => {
    const names = p.chars.filter(live).map(id => byId(id).name || 'Sans nom');
    return { names, who: p.mj ? 'Meneur de jeu' : names.length ? names.join(', ') : 'Spectateur' };
  };
  const peer = p => {
    const { names, who } = peerWho(p);
    const players = [...new Set(p.chars.filter(live).map(id => byId(id).player).filter(Boolean))];
    const sub = [p.mj && names.length ? names.join(', ') : players.join(', '), p.dev, `depuis ${mins(p.since)} min`].filter(Boolean).join(' · ');
    return `<div class="item peer">
      <span class="dot"></span>
      <b>${p.mj ? '🎲 ' : ''}${esc(who)}${p.id === S.me ? ' <small>(vous)</small>' : ''}</b>
      <small>${esc(sub)}</small></div>`;
  };
  const card = c => {
    const k = calc(c);
    const prof = COF2.profils[c.profil];
    return `<article class="card mjcard gcard${'c:' + c.id === turn ? ' cur' : ''}" data-id="${c.id}">
      <header>
        <div class="grow"><b data-calc="name"></b><small>${esc(prof ? prof.n : 'Profil ?')} niv. ${esc(c.niveau)} · ${esc(c.player || '—')}</small></div>
        <span class="pill">DEF <b data-calc="def"></b></span>
        ${scr ? '' : `<a class="btn sm ghost" href="${sheet(c)}">Fiche ›</a>`}
      </header>
      ${RES.filter(([key]) => key === 'pv' || key === 'pm').map(([key, s, l]) => resRow(c, key, s, l, false, k)).join('')}
      ${c.etats.length ? `<div class="chips">${c.etats.map(e => `<span class="chip sm on">${esc(e)}</span>`).join('')}</div>` : ''}
    </article>`;
  };
  const rows = initOrder(S.pub.npcs);
  const turn = S.pub.turn.cur; // vide quand un PNJ masqué agit
  const curRow = rows.find(r => r.key === turn);
  const tags = list => (list.length ? `<small class="etats">${list.map(esc).join(' · ')}</small>` : '');
  const initRow = r => {
    const on = r.key === turn ? ' cur' : '';
    if (r.pj) {
      const k = calc(r.c);
      return `<li class="pj${on}"><span class="ini">${r.init}</span><span class="who">${esc(r.c.name || 'Sans nom')}${tags(r.c.etats)}</span>
        <span class="small muted">${curOf(r.c, 'pv', k)}/${k.max.pv} PV</span></li>`;
    }
    const p = r.p;
    return `<li class="npc${on}" data-hp="${p.hp}"><span class="ini">${r.init}</span><span class="who">${KIND[p.kind]} ${esc(p.name)}${tags(p.etats)}</span>
      <span class="hp" title="${HP[p.hp] || 'Santé inconnue'}"></span></li>`;
  };
  const active = S.chars.filter(c => online.has(c.id));
  const away = S.chars.filter(c => !online.has(c.id));
  const awayPV = c => { const k = calc(c); return `${curOf(c, 'pv', k)}/${k.max.pv} PV`; };

  const bg = curBg();
  const missing = bg && !S.imgs.includes(bg)
    ? `<button class="bgmiss" data-a="fixbg">⚠ Lieu « ${esc(bg)} » absent de cet écran : voir les réglages</button>` : '';
  const head = scr
    ? `<button class="scr-exit" data-a="screen" title="Quitter le mode écran">✕</button>${missing}`
    : `<div class="sheet-head"><a class="back" href="#/">‹</a><h1 class="grow">Espace global</h1>
        <button class="sm" data-a="screen" title="Pour un écran partagé visible par toute la table">📺 Mode écran</button></div>`;
  const init = rows.length ? `<section class="card ginit-card">
      <h2>Initiative <span class="badge">Tour ${S.pub.turn.round}</span></h2>
      ${curRow ? `<p class="turnbar">▶ Au tour de <b>${esc(curRow.pj ? curRow.c.name || 'Sans nom' : curRow.p.name)}</b></p>` : ''}
      <ul class="init ginit">${rows.map(initRow).join('')}</ul>
    </section>` : '';
  const peers = scr
    ? `<p class="gfoot"><b>Connectés</b> ${S.peers.map(p => `<span class="tag"><span class="dot"></span>${p.mj ? '🎲 ' : ''}${esc(peerWho(p).who)}</span>`).join('') || '—'}</p>`
    : `<section class="card">
        <h2>Connectés <span class="badge">${S.peers.length}</span></h2>
        ${S.peers.length ? `<div class="list">${S.peers.map(peer).join('')}</div>` : '<p class="muted">Personne n’est connecté.</p>'}
      </section>`;
  const awayHTML = !away.length ? '' : scr
    ? `<p class="gfoot"><b>Hors ligne</b> ${away.map(c => `<span class="tag">${esc(c.name || 'Sans nom')} · ${awayPV(c)}</span>`).join('')}</p>`
    : `<section class="card away"><h3>Hors ligne</h3><div class="list">${away.map(c => `<a class="item" href="${sheet(c)}"><b>${esc(c.name || 'Sans nom')}</b><small>${esc(c.player || '—')}</small>
        <span class="badge">${awayPV(c)}</span></a>`).join('')}</div></section>`;
  return `${head}
  <div class="glayout${init ? '' : ' noinit'}">
    ${init ? `<div class="gside">${init}</div>` : ''}
    <div class="gmain">
      <h2>Personnages actifs</h2>
      ${active.length ? `<div class="cards">${active.map(card).join('')}</div>` : '<p class="muted">Aucun joueur connecté avec son personnage.</p>'}
      ${scr ? awayHTML + peers : peers + awayHTML}
    </div>
  </div>`;
}

/* ---------- Fiche de personnage ---------- */
function viewSheet(id, mj) {
  const c = byId(id);
  const back = mj ? '#/mj' : '#/joueur';
  if (!c) return `<section class="card"><p>Personnage introuvable.</p><a class="btn ghost" href="${back}">Retour</a></section>`;
  const can = mj || !!S.mine[id];
  const dis = can ? '' : ' disabled';
  const k = calc(c);
  const prof = COF2.profils[c.profil];
  const peup = COF2.peuples[c.peuple];
  const num = (p, label, attrs = '') => `<label class="f"><span>${label}</span><input type="number" inputmode="numeric" data-p="${p}" value="${esc(get(c, p))}"${attrs}${dis}></label>`;
  const txt = (p, label, attrs = '') => `<label class="f"><span>${label}</span><input type="text" data-p="${p}" value="${esc(get(c, p))}"${attrs}${dis}></label>`;
  const sel = (p, label, opts, attrs = '') => `<label class="f"><span>${label}</span>${selectHTML(p, get(c, p), opts, attrs + dis)}</label>`;
  const area = (p, label, ph = '') => `<label class="f full"><span>${label}</span><textarea data-p="${p}" placeholder="${ph}"${dis}>${esc(get(c, p))}</textarea></label>`;
  const del = (list, i) => `<button class="x" data-a="del" data-list="${list}" data-i="${i}" title="Supprimer">✕</button>`;
  const tab = S.tab;
  const tabs = [['perso', 'Perso'], ['combat', 'Combat'], ['voies', 'Voies'], ['sac', 'Sac'], ['notes', 'Notes'], ['des', 'Dés']];
  const pane = (key, body) => `<section class="pane ${tab === key ? 'on' : ''}" data-pane="${key}">${body}</section>`;
  const token = S.mine[id] || S.tokens[id];
  const niveaux = Array.from({ length: 20 }, (_, i) => [i + 1, 'Niveau ' + (i + 1)]);

  const perso = `
    <div class="grid2">
      ${txt('name', 'Nom', ' maxlength="40"')}${txt('player', 'Joueur / joueuse', ' maxlength="30"')}
      ${sel('peuple', 'Peuple', PEUPLE_OPTS)}${sel('profil', 'Profil', PROFIL_OPTS)}
      ${sel('niveau', 'Niveau', niveaux, ' data-num')}${num('xp', 'Expérience')}
    </div>
    ${prof ? `<div class="info small">
        <b>${esc(prof.n)}</b> · ${esc(COF2.familles[prof.f].n)}${COF2.familles[prof.f].note ? ` (${esc(COF2.familles[prof.f].note)})` : ''}<br>
        Caractéristiques clés : <b>${esc(prof.car)}</b>${prof.magie ? ` · magie : <b>${prof.magie}</b>` : ''}
        <details data-k="profil"><summary>Description, armes, équipement</summary>
          <p><i>${esc(prof.desc)}</i></p>${prof.bonus.map(md).join('')}
          <b>Armes & armures.</b>${md(prof.armes)}<b>Équipement de départ.</b>${md(prof.equip)}
          ${prof.extra ? `<div class="muted">${md(prof.extra)}</div>` : ''}
        </details>
      </div>` : ''}
    ${peup ? `<div class="info small"><b>${esc(peup.n)}</b> : ${esc(peup.mod)}</div>` : ''}
    <h3>Caractéristiques</h3>
    <div class="caracs">${CARACS.map(([key, l]) => `
      <div class="carac">
        <button class="roll" data-a="roll" data-roll="d20:${key}" data-label="Test ${esc(l)}">${key} 🎲</button>
        <input type="number" inputmode="numeric" min="-4" max="8" data-p="car.${key}" value="${esc(c.car[key])}"${dis}>
        <small>${l} <b class="eff" data-calc="car.${key}"></b></small>
      </div>`).join('')}
    </div>
    <p class="muted small">Valeurs de base (série + peuple). Création : ${COF2.series.map(([s, v]) => `${s} ${v}`).join(' · ')}. Les bonus des capacités (→) s’ajoutent automatiquement.</p>
    <div class="grid2">
      ${sel('ideal', 'Idéal héroïque', [['', '—'], ...COF2.ideaux.map(x => [x, x])])}
      ${sel('travers', 'Travers', [['', '—'], ...COF2.travers.map(x => [x, x])])}
    </div>
    ${can ? `
      <h3>Code de reprise</h3>
      <p class="small muted">Pour ouvrir ce personnage sur un autre appareil : <span class="code">${esc(token || '…')}</span></p>
      <div class="row">
        ${!mj ? '<button class="sm" data-a="forget">Retirer de cet appareil</button>' : ''}
        <button class="sm danger" data-a="delete">Supprimer le personnage</button>
      </div>` : `
      <h3>C’est votre personnage ?</h3>
      <form class="row" data-form="claim"><input name="code" placeholder="Code de reprise" maxlength="6" autocapitalize="characters" autocomplete="off"><button class="btn">Reprendre</button></form>`}`;

  const combat = `
    <div class="card">${RES.map(([key, s, l]) => resRow(c, key, s, l, can, k)).join('')}</div>
    <div class="derived">${DERIVED.map(([key, , l]) => `
      <div class="stat"><small>${l}</small><b data-calc="${key}"></b>
        ${key !== 'def' ? `<button class="sm" data-a="roll" data-roll="d20:@${key}" data-label="${esc(l)}">🎲</button>` : ''}
      </div>`).join('')}
    </div>
    <details data-k="div"><summary>Bonus divers & calculs</summary>
      <div class="grid3">${DIVERS.map(([key, s]) => num('div.' + key, s)).join('')}</div>
      <p class="muted small">
        PV = (niveau + 1) × ${k.fam ? k.fam.pv : '?'} + niveau × CON · DR = 2 + CON${k.fam && k.fam.drb ? ' + 1' : ''} (d${k.drType}) ·
        PC = 2 + CHA${k.fam && k.fam.pc ? ' + 1' : ''} · PM = VOL + ${k.sorts} sort(s) · Init = 10 + PER ·
        DEF = 10 + AGI (max. armure) + armure + bouclier · attaques = niveau (max. 10) + FOR / AGI / VOL.
        Les bonus permanents des capacités sont inclus ; ajoutez ici les autres (objets, conditions…).
      </p>
    </details>
    <h3>Protection</h3>
    <div class="grid2">
      ${sel('armure', 'Armure', COF2.armures.map(([v, l, d]) => [v, d ? `${l} (DEF +${d})` : l]))}
      ${sel('bouclier', 'Bouclier', COF2.boucliers.map(([v, l, d]) => [v, d ? `${l} (DEF +${d})` : l]))}
    </div>
    ${k.agiCap < k.car.AGI ? `<p class="small warn">L’armure limite l’AGI à ${sgn(k.agiCap)} pour la DEF.</p>` : ''}
    <h3>Armes</h3>
    ${c.armes.map((w, i) => weaponRow(c, w, i, k, dis, del)).join('')}
    <button data-a="add" data-list="armes">+ Ajouter une arme</button>
    <h3>États</h3>
    <div class="chips">${COF2.etats.map(([e, d]) => `<button class="chip ${c.etats.includes(e) ? 'on' : ''}" data-a="etat" data-v="${e}" title="${esc(d)}"${dis}>${e}</button>`).join('')}</div>
    ${c.etats.length ? `<ul class="small muted">${c.etats.map(e => `<li><b>${esc(e)}</b> : ${esc(ETAT_INFO[e] || '')}</li>`).join('')}</ul>` : ''}`;

  const sac = `
    <div class="grid3">${num('bourse.po', "Pièces d'or")}${num('bourse.pa', "Pièces d'argent")}${num('bourse.pc', 'Pièces de cuivre')}</div>
    <p class="muted small">1 po = 10 pa = 100 pc. Départ : 2d6 pa + sac d’aventurier (couverture, torche, briquet, outre, gamelle).</p>
    <h3>Inventaire</h3>
    ${c.inventaire.map((it, i) => `
      <div class="entry item3">
        ${txt(`inventaire.${i}.nom`, 'Objet')}${num(`inventaire.${i}.qte`, 'Qté')}${del('inventaire', i)}
        <div class="full">${txt(`inventaire.${i}.notes`, 'Notes')}</div>
      </div>`).join('')}
    <button data-a="add" data-list="inventaire">+ Ajouter un objet</button>`;

  return `<div id="sheet" class="sheet-wrap ${can ? '' : 'ro'}" data-id="${id}">
    <div class="sheet-head">
      <a href="${back}" class="back">‹</a>
      <div class="grow"><h1 data-calc="name"></h1><small class="muted">${esc(prof ? prof.n : 'Profil ?')} · niv. ${esc(c.niveau)}${can ? '' : ' · lecture seule'}</small></div>
      ${keepToggle()}
    </div>
    <nav class="tabs">${tabs.map(([key, l]) => `<button data-a="tab" data-v="${key}" class="${key === tab ? 'on' : ''}">${l}</button>`).join('')}</nav>
    ${pane('perso', perso)}${pane('combat', combat)}${pane('voies', voiesPane(c, can, k))}${pane('sac', sac)}
    ${pane('notes', area('notes', 'Notes', 'Langues, contacts, quêtes, indices…'))}
    ${pane('des', diceUI(false))}
  </div>`;
}

function weaponRow(c, w, i, k, dis, del) {
  const st = weaponStats(c, w, k);
  const opts = {
    'Contact': COF2.armes.filter(a => a[2] === 'contact').map(a => [a[0], a[1]]),
    'Distance': COF2.armes.filter(a => a[2] === 'distance').map(a => [a[0], a[1] + (a[4] && a[4].portee ? ` (${a[4].portee} m)` : '')]),
    'Autre': [['autre', 'Autre / arme spéciale…']],
  };
  const custom = st.W.custom ? `
    <label class="f"><span>Nom</span><input data-p="armes.${i}.nom" value="${esc(w.nom)}"${dis}></label>
    <label class="f"><span>Attaque</span>${selectHTML(`armes.${i}.att`, w.att || 'contact', ATTACKS, dis)}</label>
    <label class="f"><span>DM</span><input data-p="armes.${i}.dm" value="${esc(w.dm)}" placeholder="1d8+FOR"${dis}></label>` : '';
  return `<div class="entry weapon">
    <label class="f full"><span>Arme</span>${selectHTML(`armes.${i}.id`, w.id, opts, dis)}</label>
    ${custom}
    <div class="full wstat" data-calc="arme.${i}">${wstatHTML(st)}</div>
    <div class="tools">
      <button class="sm" data-a="roll" data-roll="atk:${i}" data-label="Attaque ${esc(st.W.nom)}">🎯 Attaque</button>
      <button class="sm" data-a="roll" data-roll="dm:${i}" data-label="DM ${esc(st.W.nom)}">💥 DM</button>
      <label class="f inline"><span>Bonus magique</span>${selectHTML(`armes.${i}.bonus`, n(w.bonus), [0, 1, 2, 3, 4, 5].map(b => [b, b ? '+' + b : '—']), ' data-num' + dis)}</label>
      <label class="f inline" title="Autre bonus en attaque (arme de prédilection…)"><span>Att.</span><input type="number" data-p="armes.${i}.batt" data-num value="${n(w.batt) || ''}" placeholder="0"${dis}></label>
      <label class="f inline" title="Autre bonus aux DM : nombre et/ou caractéristique (ex. PER, 2, AGI+1)"><span>DM</span><input data-p="armes.${i}.bdm" value="${esc(w.bdm)}" placeholder="ex. PER"${dis}></label>
      <span class="grow"></span>${del('armes', i)}
    </div>
  </div>`;
}

/* ---------- Voies ---------- */
const ACTION_LABEL = { A: 'Action d’attaque', L: 'Action limitée', M: 'Action de mouvement', G: 'Action gratuite' };
function voieDef(v) {
  const d = COF2.voies[v.id];
  if (d) return { ...d, kind: d.prestige ? 'prestige' : 'std' };
  return { n: v.nom || 'Voie personnalisée', caps: [1, 2, 3, 4, 5].map(r => ({ name: `Rang ${r}`, spell: false, act: '', text: '' })), kind: 'libre' };
}

function voieOptions(c) {
  const taken = new Set(c.voies.map(v => v.id));
  const prof = COF2.profils[c.profil];
  const peup = COF2.peuples[c.peuple];
  const opt = id => [id, COF2.voies[id].n];
  const free = ids => ids.filter(id => !taken.has(id)).map(opt);
  const g = {};
  g['— Ajouter une voie —'] = [['', '— Ajouter une voie —']];
  if (prof) g[`Profil : ${prof.n}`] = free(prof.voies);
  if (peup) g[`Peuple : ${peup.n}`] = free(peup.voies);
  if (prof && prof.f === 'mage') g['Mages (remplace la voie de peuple)'] = free(['mage']);
  const prestige = fam => Object.keys(COF2.voies).filter(id => COF2.voies[id].prestige && COF2.voies[id].f === fam)
    .sort((x, y) => COF2.voies[x].n.localeCompare(COF2.voies[y].n));
  if (prof) g[`Prestige ${FAM_LABEL[prof.f]} (niv. 5+)`] = free(prestige(prof.f));
  g['Prestige générique (niv. 5+)'] = free(prestige('generique'));
  for (const [pid, p] of Object.entries(COF2.profils)) {
    if (pid !== c.profil) g[`${p.n} (hybride, accord du MJ)`] = free(p.voies);
  }
  for (const fam of ['aventurier', 'combattant', 'mage', 'mystique']) {
    if (!prof || fam !== prof.f) g[`Prestige ${FAM_LABEL[fam]} (autre famille)`] = free(prestige(fam));
  }
  g['Autre'] = [['libre', 'Voie personnalisée…']];
  return g;
}

function voiesPane(c, can, k) {
  const dis = can ? '' : ' disabled';
  const niv = n(c.niveau);
  const peupleIds = new Set([...(COF2.peuples[c.peuple] ? COF2.peuples[c.peuple].voies : []), 'mage']);
  const count = c.voies.filter(v => !peupleIds.has(v.id) && voieDef(v).kind !== 'prestige').length;
  const nPrestige = c.voies.filter(v => voieDef(v).kind === 'prestige').length;
  const cards = c.voies.map((v, i) => {
    const d = voieDef(v);
    const pre = d.kind === 'prestige';
    const rang = n(v.rang);
    const caps = d.caps.map((cap, r0) => {
      const r = r0 + 1;
      const req = pre ? PRESTIGE_NIV[r0] : COF2.niveauRang[r];
      const mageR2 = r === 2 && k.fam && k.fam === COF2.familles.mage; // capacité de rang 2 des mages au niveau 1
      const late = r <= rang && niv < req && !mageR2;
      const key = `${v.id}.${r}`;
      return `<div class="caprow">
        <button class="cap ${r <= rang ? 'on' : ''} ${late ? 'late' : ''}" data-a="rang" data-i="${i}" data-r="${r}"${dis}>
          <span class="rk">${pre ? r + 3 : r}</span>
          <span class="grow"><b>${esc(cap.name)}</b>${cap.spell ? ' <span class="spell" title="Sort">✦</span>' : ''}${cap.act ? ` <span class="act" title="${ACTION_LABEL[cap.act] || ''}">${esc(cap.act)}</span>` : ''}</span>
          <small class="muted">niv. ${req}</small>
        </button>
        ${cap.text ? `<button class="info-btn ${S.openCaps.has(key) ? 'on' : ''}" data-a="capinfo" data-key="${esc(key)}" title="Description">ⓘ</button>` : ''}
        ${cap.text ? `<div class="captext" data-cap="${esc(key)}"${S.openCaps.has(key) ? '' : ' hidden'}>${md(cap.text)}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="entry voie">
      <div class="vhead"><b>${esc(voieNom(v))}</b>${pre ? '<span class="badge">prestige</span>' : ''}<span class="badge">rang ${pre && rang ? rang + 3 : rang}</span>
        <button class="x" data-a="del" data-list="voies" data-i="${i}" title="Retirer la voie">✕</button></div>
      ${d.intro ? `<details class="small"><summary>Présentation</summary>${md(d.intro)}</details>` : ''}
      ${d.kind === 'libre' ? `<label class="f"><span>Nom de la voie</span><input data-p="voies.${i}.nom" value="${esc(v.nom)}"${dis}></label>` : ''}
      ${COF2.variantes[v.id] ? `<label class="f"><span>Variante</span>${selectHTML(`voies.${i}.variante`, variante(v) ? v.variante : '',
        Object.entries(COF2.variantes[v.id]).map(([key, o]) => [key === 'std' ? '' : key, typeof o === 'string' ? o : o.n]), dis)}</label>` : ''}
      ${variante(v) && variante(v).note ? `<p class="small muted">${esc(variante(v).note)}</p>` : ''}
      <div class="caps">${caps}</div>
      <label class="f"><span>Notes (capacité choisie, précisions…)</span><input data-p="voies.${i}.notes" value="${esc(v.notes)}"${dis}></label>
    </div>`;
  }).join('');
  return `
    <p class="small muted">Touchez une capacité pour fixer le rang atteint, ⓘ pour lire sa description. Voies : ${count} / ${MAX_VOIES} (+ voie de peuple${nPrestige ? ', + prestige' : ''}) · ${k.sorts} sort(s) ✦ · coût : rangs 1-2 = 1 point, rang 3+ = 2 points ; 2 points par niveau.</p>
    ${count > MAX_VOIES ? '<p class="warn small">Maximum 6 voies + la voie de peuple.</p>' : ''}
    ${nPrestige > 1 ? '<p class="warn small">Une seule voie de prestige par personnage.</p>' : ''}
    ${!c.voies.length ? '<p class="muted">Au niveau 1 : 2 voies de profil + la voie de peuple, au rang 1 (mages : + 1 capacité de rang 2).</p>' : ''}
    ${cards}
    ${can ? `<label class="f"><span>Nouvelle voie</span>${selectHTML('', '', voieOptions(c), ' data-a-change="addvoie"')}</label>` : ''}`;
}

function resRow(c, key, s, l, can, k = calc(c)) {
  const dis = can ? '' : ' disabled';
  const max = k.max[key];
  return `<div class="resrow" data-res="${key}"${key === 'pm' && !k.lanceur ? ' hidden' : ''}>
    <div class="reshead">
      <b title="${l}">${s}</b><div class="bar"><i data-bar="${key}"></i></div>
      <span class="resnum"><input type="number" inputmode="numeric" data-p="${key}.cur" value="${curOf(c, key, k)}"${dis}>/<span data-calc="max.${key}">${max}</span>${key === 'dr' ? ` <small data-calc="drtype">d${k.drType}</small>` : ''}</span>
    </div>
    ${can ? `<div class="adj">${[-5, -1, 1, 5].map(d => `<button data-a="adj" data-k="${key}" data-d="${d}">${sgn(d)}</button>`).join('')}</div>` : ''}
  </div>`;
}

/* ---------- Dés ---------- */
function keepToggle() {
  return `<div class="seg" title="Dé bonus / dé malus sur le prochain d20">${[['', 'd20'], ['h', 'Bonus'], ['l', 'Malus']]
    .map(([v, l]) => `<button data-a="keep" data-v="${v}" class="${S.keep === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}

function diceUI(mjSecret) {
  return `<div class="card">
    <div class="dbtns">${[4, 6, 8, 10, 12, 20, 100].map(f => `<button class="die" data-a="die" data-f="${f}">d${f}</button>`).join('')}</div>
    <form class="row" data-form="roll">
      <input name="f" placeholder="ex : 2d6+3, 1d20+FOR" value="${esc(S.lastF)}" autocomplete="off" autocapitalize="characters">
      <button class="btn">Lancer</button>
    </form>
    <div class="row" style="margin-top:.5rem">${keepToggle()}
      ${mjSecret ? `<label class="chk"><input type="checkbox" data-a="secret"${S.secret ? ' checked' : ''}> Jet secret (visible du MJ seul)</label>` : ''}
    </div>
  </div>
  <h3>Journal des dés</h3>
  <ul class="log" data-log>${logHTML()}</ul>`;
}

function logHTML() {
  if (!S.log.length) return '<li class="muted">Aucun jet pour l’instant.</li>';
  return S.log.slice(-40).reverse().map(e => {
    const d = new Date(S.clock + e.ts);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const cls = [e.faces === 20 && e.nat === 20 ? 'crit' : '', e.faces === 20 && e.nat === 1 ? 'fumble' : '', e.secret ? 'secret' : ''].join(' ');
    const keep = e.keep === 'h' ? ' bonus' : e.keep === 'l' ? ' malus' : '';
    return `<li class="${cls}"><span class="t">${time}</span><span><b>${esc(e.who)}</b> ${esc(e.label)}${e.secret ? ' 🔒' : ''}</span>
      <b class="tot">${e.total}</b><span class="d">${esc(e.f)} [${e.rolls.join(', ')}]${keep}</span></li>`;
  }).join('');
}

/* « 2d6+3 », « 1d8+FOR », « d20-1 » → { n, f, mod } (un seul type de dé). */
function parseFormula(str, c) {
  const s = String(str || '').toUpperCase().replace(/\s+/g, '');
  if (!s) return null;
  const car = c ? calc(c).car : null;
  const re = /([+-]?)(\d*D\d+|\d+|[A-Z]{3})/g;
  let m, pos = 0, dice = null, mod = 0;
  while ((m = re.exec(s))) {
    if (m.index !== pos) return null;
    pos = re.lastIndex;
    const sign = m[1] === '-' ? -1 : 1;
    const tok = m[2];
    if (tok.includes('D')) {
      if (dice || sign < 0) return null;
      const [a, b] = tok.split('D');
      dice = { n: a ? +a : 1, f: +b };
    } else if (/^\d+$/.test(tok)) mod += sign * +tok;
    else if (car && tok in car) mod += sign * car[tok];
    else if (c && tok === 'NIV') mod += sign * n(c.niveau);
    else return null;
  }
  if (pos !== s.length || !dice || dice.n < 1 || dice.n > 20 || dice.f < 2) return null;
  return { n: dice.n, f: dice.f, mod };
}

function doRoll(who, label, f, opts = {}) {
  const rq = Math.random().toString(36).slice(2, 10);
  S.lastRq = rq;
  const keep = f.n === 1 && f.f === 20 ? S.keep : '';
  const ok = send({
    t: 'roll', who, label, n: f.n, f: f.f, mod: f.mod, keep, rq,
    secret: !!opts.secret, ...(S.isMJ ? { pin: S.pin } : {}),
  });
  if (!ok) return toast('Hors ligne : jet impossible');
  if (keep) { S.keep = ''; $$('[data-a=keep]').forEach(b => b.classList.toggle('on', b.dataset.v === '')); }
}

let rollT;
function showRoll(e) {
  const box = $('#roll');
  const cls = e.faces === 20 && e.nat === 20 ? 'crit' : e.faces === 20 && e.nat === 1 ? 'fumble' : '';
  const keep = e.keep === 'h' ? ' (dé bonus)' : e.keep === 'l' ? ' (dé malus)' : '';
  box.innerHTML = `<div class="box ${cls}">
    <div class="muted">${esc(e.label || e.f)}</div>
    <div class="total">${e.total}</div>
    <div class="small muted">${esc(e.f)} → [${e.rolls.join(', ')}]${keep}</div>
    ${cls === 'crit' ? '<div>✨ Réussite critique !</div>' : cls === 'fumble' ? '<div>💀 1 naturel !</div>' : ''}
  </div>`;
  box.hidden = false;
  clearTimeout(rollT);
  rollT = setTimeout(() => { box.hidden = true; }, 4000);
}
$('#roll').addEventListener('click', () => { $('#roll').hidden = true; });

/* ---------- MJ ---------- */
function viewLogin() {
  return `<section class="card narrow">
    <h2>Espace MJ</h2>
    <form class="col" data-form="login">
      <input name="pin" type="password" inputmode="numeric" placeholder="Code MJ" autocomplete="current-password" required>
      <button class="btn">Entrer</button>
    </form>
    <p><a href="#/">‹ Retour</a></p>
  </section>`;
}

function viewMJ() {
  const tabs = [['groupe', 'Groupe'], ['init', 'Initiative'], ['journal', 'Dés'], ['outils', 'Outils']];
  const views = { groupe: mjGroup, init: mjInit, journal: () => diceUI(true), outils: mjTools };
  return `<div class="mj">
    <nav class="tabs">${tabs.map(([key, l]) => `<button data-a="mjtab" data-v="${key}" class="${key === S.mjtab ? 'on' : ''}">${l}</button>`).join('')}</nav>
    ${views[S.mjtab]()}
  </div>`;
}

function mjGroup() {
  if (!S.chars.length) return '<p class="muted center">Aucun personnage. Les joueurs créent leur fiche depuis l’accueil.</p>';
  return `<div class="cards">${S.chars.map(c => {
    const k = calc(c);
    const prof = COF2.profils[c.profil];
    const gear = [
      c.armure && `🛡 ${esc(ARMURES[c.armure].nom)}`,
      c.bouclier && `🛡 ${esc(BOUCLIERS[c.bouclier].nom)}`,
      ...c.armes.map(w => { const st = weaponStats(c, w, k); return `⚔ ${esc(st.W.nom)} ${sgn(st.att)} · ${esc(st.dm)}`; }),
    ].filter(Boolean);
    const voies = c.voies.map(v => `${esc(voieNom(v).replace(/^Voie (de la |du |des |de l’|de l'|d’)?/, ''))} ${n(v.rang)}`).join(', ');
    return `<article class="card mjcard" data-id="${c.id}">
      <header>
        <div class="grow"><b data-calc="name"></b><small>${esc(prof ? prof.n : 'Profil ?')} niv. ${esc(c.niveau)} · ${esc(c.player || '—')}</small></div>
        <a class="btn sm ghost" href="#/mj/c/${c.id}">Fiche ›</a>
      </header>
      ${RES.map(([key, s, l]) => resRow(c, key, s, l, true, k)).join('')}
      <div class="statline">${DERIVED.map(([key, s]) => `<span>${s} <b data-calc="${key}"></b></span>`).join('')}</div>
      <div class="chips">${COF2.etats.map(([e, d]) => `<button class="chip sm ${c.etats.includes(e) ? 'on' : ''}" data-a="etat" data-v="${e}" title="${esc(d)}">${e}</button>`).join('')}</div>
      <div class="gear small">${gear.join(' · ') || 'Aucun équipement'}</div>
      ${voies ? `<div class="gear small">✦ ${voies}</div>` : ''}
      <small class="muted">${esc(c.bourse.po)} po · ${esc(c.inventaire.length)} objet(s) · code <span class="code small">${esc(S.tokens[c.id] || '?')}</span></small>
    </article>`;
  }).join('')}</div>`;
}

/* Anciennes versions : PNJ enregistrés sur l'appareil du MJ, repris une fois sur la station. */
function migrateNpcs() {
  const old = load('npcs', []);
  if (!old.length) return;
  if (!S.combat.npcs.length) {
    old.forEach(p => S.combat.npcs.push({ id: 'n' + S.combat.next++, kind: 'monstre', name: p.name || '', init: n(p.init), pv: n(p.pv), pvmax: n(p.pv), etats: [], show: false }));
    pushCombat();
  }
  save('npcs', []);
}

function mjInit() {
  const C = S.combat;
  const rows = initOrder(C.npcs);
  const cur = curKey(rows, C.turn.cur);
  const etats = p => COF2.etats.map(([e, d]) => `<button class="chip sm ${p.etats.includes(e) ? 'on' : ''}" data-a="npc-etat" data-n="${p.id}" data-v="${e}" title="${esc(d)}">${e}</button>`).join('');
  return `<div class="row"><b class="grow">Tour ${C.turn.round}</b>
      <button data-a="turn-next" class="btn">Suivant ▶</button><button data-a="turn-reset" title="Recommencer au tour 1">↺</button></div>
    <ul class="init">${rows.map(r => {
      const on = r.key === cur ? ' cur' : '';
      if (r.pj) {
        const k = calc(r.c);
        return `<li class="pj${on}"><span class="ini">${r.init}</span><span class="who">${esc(r.c.name || 'Sans nom')}</span><span class="small muted">${curOf(r.c, 'pv', k)}/${k.max.pv} PV</span><span></span></li>`;
      }
      const p = r.p;
      return `<li class="npc${on}${p.show ? '' : ' masked'}" data-hp="${hpLevel(p.pv, p.pvmax)}">
          <input type="number" inputmode="numeric" class="ini" data-npc="${p.id}.init" value="${esc(p.init)}">
          <span class="who">${KIND[p.kind]}<input data-npc="${p.id}.name" value="${esc(p.name)}" maxlength="30"></span>
          <span class="pvs"><input type="number" inputmode="numeric" data-npc="${p.id}.pv" value="${esc(p.pv)}" title="PV">/<input type="number" inputmode="numeric" data-npc="${p.id}.pvmax" value="${esc(p.pvmax)}" title="PV max"></span>
          <span class="acts"><button class="sm eye ${p.show ? 'on' : ''}" data-a="npc-show" data-n="${p.id}" title="${p.show ? 'Visible' : 'Masqué'} dans l’espace global">${p.show ? '👁' : '🚫'}</button><button class="x" data-a="npc-del" data-n="${p.id}" title="Supprimer">✕</button></span>
          <details class="npcx" data-k="npc-${p.id}"><summary>États${p.etats.length ? ' : ' + esc(p.etats.join(', ')) : ''}</summary><div class="chips">${etats(p)}</div></details>
        </li>`;
    }).join('')}
    </ul>
    <form class="npcform" data-form="npc">
      <select name="kind"><option value="monstre">👹 Monstre</option><option value="pnj">👤 PNJ</option></select>
      <input name="name" placeholder="Nom (ex : Gobelin)" maxlength="30" required>
      <input name="init" type="number" inputmode="numeric" placeholder="Init" required>
      <input name="pv" type="number" inputmode="numeric" placeholder="PV" min="0">
      <input name="qty" type="number" inputmode="numeric" placeholder="× 1" min="1" max="10" title="Nombre (numérotés)">
      <label class="chk"><input type="checkbox" name="show"> Visible</label>
      <button class="btn">Ajouter</button>
    </form>
    ${C.npcs.length ? `<div class="row"><button class="sm" data-a="npc-allshow" data-v="1">👁 Tout montrer</button><button class="sm" data-a="npc-allshow" data-v="0">🚫 Tout masquer</button><button class="sm danger" data-a="npc-clear">Retirer tous les PNJ</button></div>` : ''}
    <p class="muted small">Init des créatures = 10 + PER (+ bonus). Égalité : les PJ d’abord. 👁 = visible dans l’espace global : initiative, états et santé en couleur
      (vert, jaune sous 2/3 des PV, rouge sous 1/3), jamais les PV.</p>`;
}

function mjTools() {
  const ids = [...new Set(S.peers.flatMap(p => p.imgs || []))].sort();
  const bg = S.combat.bg;
  return `<section class="card"><h3>Lieu affiché sur l’écran partagé</h3>
      <form class="row" data-form="bg"><input name="bg" list="bglist" placeholder="ID du lieu (ex : ville)" value="${esc(bg)}" autocomplete="off">
        <datalist id="bglist">${ids.map(id => `<option value="${esc(id)}">`).join('')}</datalist>
        <button class="btn">Afficher</button>${bg ? '<button type="button" data-a="bg-clear">Aucun</button>' : ''}</form>
      ${ids.length ? `<div class="chips">${ids.map(id => `<button class="chip sm ${id === bg ? 'on' : ''}" data-a="bg-set" data-v="${esc(id)}">${esc(id)}</button>`).join('')}</div>` : ''}
      <p class="muted small">Les images sont sur l’appareil en mode écran (⚙ Réglages de cet appareil → dossier d’images) ; leurs ID s’affichent ici quand il est connecté.</p>
    </section>
    <section class="card"><h3>Expérience</h3>
      <form class="row" data-form="xp"><input name="xp" type="number" inputmode="numeric" placeholder="XP" required><button class="btn">Donner à tout le groupe</button></form>
    </section>
    <section class="card"><h3>Repos</h3>
      <div class="row"><button data-a="rest-full">Récupération complète du groupe</button></div>
      <p class="muted small">8 h : +1 DR (sans dépasser le maximum) et tous les PM. Les PV se regagnent en dépensant des DR (récupération rapide : 1 DR + ½ niveau PV).</p>
    </section>
    <section class="card"><h3>Sauvegarde</h3>
      <div class="row"><button data-a="export">⬇ Exporter (JSON)</button>
        <label class="btn ghost">⬆ Importer<input type="file" accept=".json,application/json" data-import hidden></label></div>
      <p class="muted small">L’import remplace tous les personnages de la station.</p>
    </section>
    <section class="card"><h3>Divers</h3>
      <div class="row"><button data-a="clearlog">Vider le journal des dés</button><button data-a="mjlogout" class="danger">Quitter le mode MJ</button></div>
    </section>`;
}

/* ===================== Interactions ===================== */
const app = $('#app');

function valueOf(el) {
  if (el.type === 'number' || el.dataset.num !== undefined) return el.value === '' || isNaN(+el.value) ? 0 : +el.value;
  return el.value;
}
const charOf = el => { const s = el.closest('[data-id]'); return s ? byId(s.dataset.id) : null; };

function onField(e) {
  const el = e.target;
  if (el.dataset.npc) {
    const [id, key] = el.dataset.npc.split('.');
    const npc = npcById(id);
    if (!npc) return;
    npc[key] = key === 'name' ? el.value : n(el.value);
    pushCombat();
    if (e.type === 'change') render();
    return;
  }
  const p = el.dataset.p;
  const c = charOf(el);
  if (!p || !c) return;
  change(c, p, valueOf(el));
  if (el.tagName === 'SELECT') { el.blur(); render(); } else refreshCalc();
}
app.addEventListener('input', e => { if (e.target.tagName !== 'SELECT') onField(e); });
app.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-import]')) return importFile(el.files[0]);
  if (el.dataset.aChange === 'addvoie') {
    const c = charOf(el);
    if (c && el.value) change(c, 'voies', [...c.voies, { id: el.value, rang: el.value === 'libre' ? 0 : 1, notes: '', ...(el.value === 'libre' ? { nom: '' } : {}) }], true);
    el.blur();
    return render();
  }
  if (el.tagName === 'SELECT' || el.dataset.npc) onField(e);
});

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
  screenon() { if (!S.screen) setScreen(true); location.hash = '#/global'; },
  fixbg() { setScreen(false); location.hash = '#/config'; },
  imgdir() { pickImgs(true); },
  imgadd() { pickImgs(false); },
  imgclear() {
    if (!confirm('Effacer toutes les images de cet appareil ?')) return;
    IMG.clear().then(() => { S.imgDir = null; save('imgdir', null); refreshImgs(); }, () => toast('Effacement impossible'));
  },
  imgdel(el) {
    if (!confirm(`Supprimer l’image « ${el.dataset.v} » de cet écran ?`)) return;
    IMG.del(el.dataset.v).then(refreshImgs, () => toast('Suppression impossible'));
  },
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
  mjlogout() { S.isMJ = false; S.pin = ''; S.tokens = {}; save('pin', ''); location.hash = '#/'; },
};

/* Nom affiché dans le journal pour les dés « libres ». */
function rollerName(c) {
  if (c) return c.name || 'Sans nom';
  return route()[0] === 'mj' ? 'MJ' : 'Joueur';
}

app.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.a];
  if (fn) fn(el, charOf(el), e);
});

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
app.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const fn = FORMS[form.dataset.form];
  if (fn) fn(Object.fromEntries(new FormData(form)), form);
});

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

/* ===================== Lieux : images de fond du mode écran =====================
 * Stockées dans le navigateur de l'écran (IndexedDB), jamais sur la station : le MJ ne diffuse que l'ID. */
function imgId(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
}
const IMG = (() => {
  let dbp;
  const db = () => dbp || (dbp = new Promise((ok, ko) => {
    const r = indexedDB.open('jdr-images', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { dbp = null; ko(r.error); };
  }));
  const tx = (mode, fn) => db().then(d => new Promise((ok, ko) => {
    const t = d.transaction('img', mode);
    const rq = fn(t.objectStore('img'));
    t.oncomplete = () => ok(rq.result);
    t.onerror = t.onabort = () => ko(t.error);
  }));
  return {
    get: id => tx('readonly', st => st.get(id)),
    put: (id, blob) => tx('readwrite', st => st.put(blob, id)),
    del: id => tx('readwrite', st => st.delete(id)),
    keys: () => tx('readonly', st => st.getAllKeys()),
    clear: () => tx('readwrite', st => st.clear()),
  };
})();
const curBg = () => (S.isMJ ? S.combat : S.pub).bg;
function setBg(v) {
  S.combat.bg = imgId(v);
  pushCombat();
  render();
}
/* Liste des images de cet écran, avec une miniature pour chacune. */
function refreshImgs() {
  return IMG.keys().then(keys => Promise.all(keys.map(k => IMG.get(k))).then(blobs => {
    Object.values(S.thumbs).forEach(u => URL.revokeObjectURL(u));
    S.thumbs = {};
    keys.forEach((k, i) => { if (blobs[i]) S.thumbs[k] = URL.createObjectURL(blobs[i]); });
    S.imgs = keys.map(String).sort();
    S.imgErr = false;
    sendPresence();
    bgShown = null; // une image a pu être remplacée
    update();
  })).catch(() => { S.imgErr = true; update(); });
}
/* Sélection de fichiers ou d'un dossier entier (sous-dossiers compris). Le navigateur ne peut pas relire
 * un dossier tout seul depuis une page http : on copie son contenu, à resynchroniser après modification.
 * Champ hors de #app : un re-rendu pendant la sélection ne doit pas faire perdre l'import. */
function pickImgs(dir) {
  const inp = document.createElement('input');
  Object.assign(inp, { type: 'file', accept: 'image/*', multiple: true, hidden: true, webkitdirectory: dir });
  inp.addEventListener('change', () => { importImgs(inp.files, dir); inp.remove(); });
  document.body.append(inp);
  inp.click();
}
function importImgs(files, dir) {
  const idOf = f => imgId(f.name.replace(/\.[^.]*$/, ''));
  const list = [...files].filter(f => (f.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(f.name)) && idOf(f));
  if (!list.length) return toast('Aucune image trouvée');
  /* Un dossier remplace toute la bibliothèque : les images retirées du dossier disparaissent. */
  (dir ? IMG.clear() : Promise.resolve())
    .then(() => Promise.all(list.map(f => IMG.put(idOf(f), f))))
    .then(() => {
      if (dir) {
        S.imgDir = { name: (list[0].webkitRelativePath || '').split('/')[0] || 'Dossier', n: new Set(list.map(idOf)).size, at: Date.now() };
        save('imgdir', S.imgDir);
      }
      toast(dir ? `${S.imgDir.n} image(s) synchronisée(s)` : `Ajouté : ${list.map(idOf).join(', ')}`);
      refreshImgs();
    }, () => toast('Enregistrement impossible (stockage plein ou navigation privée ?)'));
}
/* Calque de fond derrière l'espace global, uniquement en mode écran. */
let bgShown = null, bgUrl = '';
function showBg() {
  const id = S.screen && route()[0] === 'global' ? curBg() : '';
  if (id === bgShown) return;
  bgShown = id;
  let el = $('#bg');
  if (!el) { el = document.createElement('div'); el.id = 'bg'; document.body.prepend(el); }
  const set = blob => {
    if (bgShown !== id) return; // l'ID a changé entre-temps
    if (bgUrl) URL.revokeObjectURL(bgUrl);
    bgUrl = blob ? URL.createObjectURL(blob) : '';
    el.style.backgroundImage = bgUrl ? `url("${bgUrl}")` : '';
    document.documentElement.classList.toggle('hasbg', !!bgUrl);
  };
  if (!id) set(null); else IMG.get(id).then(set, () => set(null));
}

/* Écran partagé : il s'ouvre directement sur l'espace global, reste allumé et se rafraîchit seul. */
function setScreen(on) {
  S.screen = on;
  save('screen', on);
  const d = document;
  try {
    if (on && d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {});
    else if (!on && d.fullscreenElement) d.exitFullscreen();
  } catch (err) { /* plein écran indisponible */ }
  keepAwake();
  sendPresence();
  render();
}
let wakeLock = null;
function keepAwake() {
  try {
    if (S.screen && !wakeLock && navigator.wakeLock) {
      navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
    } else if (!S.screen && wakeLock) wakeLock.release();
  } catch (err) { /* API absente (page non sécurisée) */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });
setInterval(() => { if (route()[0] === 'global' && !isEditing()) render(); }, 30000);
if (S.screen && route()[0] !== 'global') location.hash = '#/global';
keepAwake();
refreshImgs();

connect();
