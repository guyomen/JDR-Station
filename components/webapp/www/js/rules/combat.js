/* Combat : PNJ, monstres, santé en couleur (format partagé avec la station). */

const KIND = { monstre: '👹', pnj: '👤' };
const HP = { g: 'En forme', y: 'Blessé', r: 'Gravement blessé', d: 'Mort' };
/* Santé en couleur, dans l'ordre : noir (mort) à 0 PV, vert à 100 % des PV, rouge à 1 PV restant
   (petites créatures à 2-3 PV), puis rouge à 1/3 des PV ou moins, jaune à 2/3 ou moins, vert au-delà.
   Pas de PV négatifs. Sans PV max (créature ajoutée sans PV), pas de santé affichée.
   Un mort reste dans l'initiative (il peut être relevé). */
function hpLevel(pv, max) {
  if (!(max > 0)) return '';
  if (pv <= 0) return 'd';
  if (pv >= max) return 'g';
  if (pv === 1) return 'r';
  return 3 * pv <= max ? 'r' : 3 * pv <= 2 * max ? 'y' : 'g';
}
function normCombat(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const t = o.turn || {};
  return {
    npcs: (Array.isArray(o.npcs) ? o.npcs : []).map(p => ({
      id: String(p.id), kind: p.kind === 'pnj' ? 'pnj' : 'monstre', name: String(p.name || ''), init: n(p.init),
      pv: Math.max(0, n(p.pv)), pvmax: Math.max(0, n(p.pvmax)), etats: Array.isArray(p.etats) ? p.etats : [], show: !!p.show, hp: p.hp || '',
    })),
    turn: { cur: t.cur || '', round: n(t.round) || 1 },
    next: n(o.next) || 1,
    bg: imgId(o.bg),               // lieu affiché en fond de l'écran partagé (ID d'un lieu de S.lieux)
  };
}
