/* Initiative (PJ + PNJ) côté MJ : ordre, tour en cours, synchronisation avec la station. */

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
