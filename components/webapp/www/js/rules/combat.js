/* Combat : PNJ, monstres, santé en couleur (format partagé avec la station). */

const KIND = { monstre: '👹', pnj: '👤' };
const HP = { g: 'En forme', y: 'Blessé', r: 'Gravement blessé', d: 'Mort' };
/* Santé en couleur : noir (mort) sous 0 PV, rouge sous 1/3 des PV, jaune sous 2/3, vert au-delà.
   Un mort reste dans l'initiative (il peut être relevé). */
function hpLevel(pv, max) {
  if (pv < 0) return 'd';
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
    bg: imgId(o.bg),               // lieu affiché en fond de l'écran partagé (ID d'un lieu de S.lieux)
  };
}
