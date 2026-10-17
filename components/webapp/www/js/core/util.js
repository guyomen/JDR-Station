/* Utilitaires purs : nombres, échappement HTML, mini-Markdown, chemins d'objets, ID d'images. */

const n = v => (Number.isFinite(+v) ? +v : 0);
/* Comparaison souple : sans accents ni casse. */
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

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

function imgId(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
}
