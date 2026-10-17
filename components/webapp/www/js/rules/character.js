/* Fiche de personnage : fiche vierge, valeurs calculées selon les règles COF2, voies, armes. */

function blankChar() {
  return {
    name: '', player: '', peuple: '', profil: '', niveau: 1, ideal: '', travers: '',
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

function voieDef(v) {
  const d = COF2.voies[v.id];
  if (d) return { ...d, kind: d.prestige ? 'prestige' : 'std' };
  return { n: v.nom || 'Voie personnalisée', caps: [1, 2, 3, 4, 5].map(r => ({ name: `Rang ${r}`, spell: false, act: '', text: '' })), kind: 'libre' };
}
