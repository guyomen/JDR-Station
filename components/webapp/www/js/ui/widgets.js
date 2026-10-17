/* Composants HTML partagés entre les vues. */

/* Liste déroulante : options [valeur, libellé] ou groupes { 'Groupe': [[valeur, libellé]…] }. */
function selectHTML(p, value, options, attrs = '') {
  const opt = ([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`;
  const body = Array.isArray(options) ? options.map(opt).join('')
    : Object.entries(options).filter(([, o]) => o.length).map(([g, o]) => `<optgroup label="${esc(g)}">${o.map(opt).join('')}</optgroup>`).join('');
  return `<select${p ? ` data-p="${p}"` : ''}${attrs}>${body}</select>`;
}
const peupleOpts = () => [['', '— Peuple —'], ...Object.entries(COF2.peuples).map(([id, p]) => [id, p.n])];
function profilOpts() {
  const g = {};
  for (const [id, p] of Object.entries(COF2.profils)) {
    const fam = COF2.familles[p.f] ? COF2.familles[p.f].n : 'Autres profils';
    (g[fam] = g[fam] || []).push([id, p.n]);
  }
  return { '': [['', '— Profil —']], ...g };
}

const wstatHTML = st => {
  const info = [st.portee ? `portée ${st.portee} m` : '', st.crit < 20 ? `critique ${st.crit}-20` : '', st.W.note, ...st.src].filter(Boolean).join(' · ');
  return `<b>${sgn(st.att)}</b> attaque · <b>${esc(st.dm)}</b> DM${info ? ` <span class="muted small">· ${esc(info)}</span>` : ''}`;
};

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
