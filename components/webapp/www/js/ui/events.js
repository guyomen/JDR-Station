/* Saisie dans les champs : fiches (data-p) et PNJ (data-npc). */

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
