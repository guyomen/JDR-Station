/* Données de jeu : construites au démarrage à partir des documents de règles (parse.js),
 * ceux d'origine ou ceux de la table (envoyés par le MJ). Rien n'est codé en dur ici. */

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
const ACTION_LABEL = { A: 'Action d’attaque', L: 'Action limitée', M: 'Action de mouvement', G: 'Action gratuite' };

/* Remplis par buildRules() : COF2 (familles, profils, peuples, voies, variantes, armes…) et index. */
let COF2 = null;
let WEAPONS = {}, ARMURES = {}, BOUCLIERS = {}, ETAT_INFO = {};

/* ---------- Lignes « Bonus » des capacités ----------
 * Éléments séparés par « · » : « DEF +1 », « Init +CHA », « PV +FOR », « AGI +1 », « PM = CHA + sorts »,
 * « armes arc/arbalète : attaque +1, DM +PER, critique +1, portée ×2 », « aucun ».
 * Renvoie { fx, errors } ; fx a la forme { def, init, pv, pm, pc, dr, car: {AGI: 1}, pmcar, arme: {cat: {att, dm, crit, portee}} }. */
const BONUS_STATS = { def: 'def', init: 'init', pv: 'pv', pm: 'pm', pc: 'pc', dr: 'dr' };
const CARAC_KEYS = CARACS.map(([k]) => k);
function parseBonus(text) {
  const fx = {};
  const errors = [];
  const value = v => (/^\d+$/.test(v) ? +v : CARAC_KEYS.includes(v.toUpperCase()) ? v.toUpperCase() : null);
  for (const raw of String(text || '').split(/\s+·\s+/)) {
    const t = raw.trim().replace(/−/g, '-');
    if (!t || fold(t) === 'aucun') continue;
    let m = t.match(/^armes?\s+(.+?)\s*:\s*(.+)$/i);
    if (m) {
      for (const cat of m[1].split('/').map(fold)) {
        fx.arme = fx.arme || {};
        const b = (fx.arme[cat] = fx.arme[cat] || {});
        for (const e of m[2].split(/\s*,\s*/)) {
          const em = fold(e).match(/^(attaque|dm|critique|portee)\s*([+×x*])\s*([a-z0-9]+)$/);
          const v = em && value(em[3]);
          if (!em || v == null || (em[1] !== 'attaque' && em[1] !== 'dm' && typeof v !== 'number')) { errors.push(`« ${e} » (armes ${cat})`); continue; }
          b[{ attaque: 'att', dm: 'dm', critique: 'crit', portee: 'portee' }[em[1]]] = v;
        }
      }
      continue;
    }
    if ((m = t.match(/^PM\s*=\s*([A-Za-z]{3})\s*\+\s*sorts$/i)) && value(m[1])) { fx.pmcar = m[1].toUpperCase(); continue; }
    m = t.match(/^([A-Za-zé]+)\s*([+-])\s*(\w+)$/);
    const key = m && fold(m[1]);
    const v = m && value(m[3]);
    if (m && BONUS_STATS[key] && v != null && (m[2] === '+' || typeof v === 'number')) {
      fx[BONUS_STATS[key]] = m[2] === '-' ? -v : v;
      continue;
    }
    if (m && CARAC_KEYS.includes(m[1].toUpperCase()) && typeof v === 'number') {
      (fx.car = fx.car || {})[m[1].toUpperCase()] = m[2] === '-' ? -v : v;
      continue;
    }
    errors.push(`« ${t} »`);
  }
  return { fx, errors };
}

const firstNum = (s, def) => { const m = String(s || '').match(/\d+/); return m ? +m[0] : def; };

/* Tables de jeu (forme de COF2) à partir du modèle de parseRules(), sans les mettre en service.
 * warn(message) reçoit les incohérences. */
function buildRules(D, warn = () => {}) {
  const fams = Object.fromEntries(Object.entries(D.familles || {}).map(([k, f]) => [k, { n: f.name, note: f.note, r2niv1: !!f.r2niv1, alt: f.alt || '' }]));
  const profils = {};
  for (const [k, p] of Object.entries(D.profils || {})) {
    if (!fams[p.famille]) warn(`profil « ${p.name} » : famille inconnue « ${p.famille} »`);
    profils[k] = {
      n: p.name, f: p.famille, car: p.car, magie: p.magie, desc: p.desc, armes: p.armes, equip: p.equipement, extra: p.extra,
      bonus: p.bonus, voies: p.voies.filter(v => D.voies[v]),
      pv1: firstNum(p.pv1, 8), pvniv: firstNum(p.pvniv, 4), dr: firstNum(p.dr, 8), drn: firstNum(p.drn, 2), pc: firstNum(p.pc, 2),
    };
  }
  /* Un peuple a une section « Caractéristiques » (la section « Mage » de peuples.md n'en a pas). */
  const peuples = {};
  for (const [k, p] of Object.entries(D.peuples || {})) {
    const m = p.body.match(/(?:^|\n)#+ Caractéristiques\s*\n([\s\S]*?)(?=\n#+ |$)/);
    if (m) peuples[k] = { n: p.name, mod: m[1].trim().replace(/‐/g, '−'), voies: p.voies.filter(v => D.voies[v]) };
  }
  const fxOf = (text, where) => {
    const r = parseBonus(text);
    r.errors.forEach(e => warn(`${where} : bonus non reconnu ${e}`));
    return r.fx;
  };
  const voies = {}, variantes = {};
  for (const [id, v] of Object.entries(D.voies || {})) {
    const fx = {};
    v.caps.forEach((c, i) => { if (c.bonus) fx[i + 1] = fxOf(c.bonus, `${v.name}, ${c.name}`); });
    if (v.caps.length !== 5) warn(`${v.name} : ${v.caps.length} capacités au lieu de 5`);
    voies[id] = {
      n: v.name, f: v.famille, prestige: !!v.prestige, intro: v.intro, fx: Object.keys(fx).length ? fx : undefined,
      caps: v.caps.map(c => ({ name: c.name, rang: c.rang, spell: !!c.spell, act: c.action, text: c.text })),
    };
    if (v.variantes && v.variantes.list.length) {
      const vs = (variantes[id] = { std: v.variantes.std || 'Standard' });
      for (const o of v.variantes.list) {
        const e = (vs[o.id] = { n: o.name, note: o.note });
        if (o.voie) e.v = o.voie;
        const ranks = Object.entries(o.bonus || {});
        /* « Bonus rang N » : N est le rang affiché (4 à 8 en prestige) ; fx est indexé par position (1 à 5). */
        const pos = r => v.caps.findIndex(c => c.rang === +r) + 1 || +r;
        if (ranks.length) e.fx = Object.fromEntries(ranks.map(([r, b]) => [pos(r), fxOf(b, `${v.name}, variante ${o.name}`)]));
      }
    }
  }
  const armes = (D.armes || []).map(a => {
    const mots = a.mots.map(fold);
    return { id: a.id, nom: a.name, att: a.att, dm: a.dm, portee: a.portee || undefined, crit: a.crit && a.crit < 20 ? a.crit : undefined,
      cats: mots.filter(m => m !== 'sans for'), nofor: mots.includes('sans for'), note: a.notes, prix: a.prix };
  });
  /* Catégories visées par un bonus mais portées par aucune arme : faute de frappe probable. */
  const cats = new Set(['contact', 'distance', ...armes.flatMap(a => a.cats)]);
  const checkCats = (fx, where) => Object.values(fx || {}).forEach(r => Object.keys(r.arme || {}).forEach(cat => {
    if (!cats.has(cat)) warn(`${where} : catégorie d’arme « ${cat} » portée par aucune arme`);
  }));
  for (const v of Object.values(voies)) checkCats(v.fx, v.n);
  for (const [id, vs] of Object.entries(variantes)) for (const o of Object.values(vs)) if (o.fx) checkCats(o.fx, voies[id].n);

  const niveaux = Object.fromEntries(Object.entries(D.niveaux || {}).map(([r, l]) => [+r, l]));
  return {
    familles: fams, profils, peuples, voies, variantes, armes,
    armures: [{ id: '', nom: 'Aucune', def: 0, agi: 99 }, ...(D.armures || []).map(a => ({ id: a.id, nom: a.name, def: a.def, agi: a.agi || 99, prix: a.prix }))],
    boucliers: [{ id: '', nom: 'Aucun', def: 0 }, ...(D.boucliers || []).map(b => ({ id: b.id, nom: b.name, def: b.def, prix: b.prix }))],
    etats: (D.etats || []).map(e => [e.name, e.effet]),
    ideaux: D.ideaux || [], travers: D.travers || [],
    series: (D.series || []).map(s => [s.name, s.valeurs]),
    niveaux: Object.keys(niveaux).length ? niveaux : { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 9, 7: 11, 8: 13 },
  };
}

/* Met des tables en service (COF2 et index). */
function useRules(tables) {
  COF2 = tables;
  WEAPONS = Object.fromEntries(COF2.armes.map(a => [a.id, a]));
  ARMURES = Object.fromEntries(COF2.armures.map(a => [a.id, a]));
  BOUCLIERS = Object.fromEntries(COF2.boucliers.map(b => [b.id, b]));
  ETAT_INFO = Object.fromEntries(COF2.etats);
  return COF2;
}

/* Familles proposant leurs voies de prestige à tous : celles qui n'ont aucun profil (« Génériques »). */
const familleOuverte = f => !Object.values(COF2.profils).some(p => p.f === f);
