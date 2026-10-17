/* Vue : Espace Règles, consultation des documents en vigueur (RULES.texts, chargés au démarrage). */

/* doc -> HTML rendu (calculé à la première consultation). */
const rulesDocs = {};

/* Ancre de la route #/regles/<doc>/<ancre>, ou null. */
function rulesAnchor() {
  const r = route();
  if (r[0] !== 'regles' || !r[2]) return null;
  try { return decodeURIComponent(r[2]); } catch (e) { return r[2]; }
}
function rulesScroll() {
  const a = rulesAnchor();
  const el = a && document.getElementById('r-' + a);
  if (el) el.scrollIntoView();
  return !!el;
}

function viewRules(doc) {
  if (!RULES_DOCS[doc]) doc = 'regles';
  const tabs = Object.entries(RULES_DOCS).map(([k, t]) =>
    `<a class="btn sm${k === doc ? '' : ' ghost'}" href="#/regles/${k}">${t}</a>`).join('');
  if (S.rules === 'ok' && !rulesDocs[doc]) rulesDocs[doc] = mdDoc(RULES.texts[doc] || '', doc);
  const body = S.rules === 'ok' ? rulesDocs[doc] : rulesStatus();
  return `<nav class="row rules-tabs">${tabs}</nav>
    <article class="card mddoc">${body}</article>
    <p class="muted small center">Chroniques Oubliées Fantasy 2e édition © Black Book Éditions —
      <a href="https://drs.chroniques-oubliees.fr/fantasy" target="_blank" rel="noopener">DRS</a>.</p>`;
}

/* ---------- Rendu Markdown des documents ---------- */

/* Identifiant d'ancre à la manière de GitHub (les liens des sommaires s'appuient dessus). */
const mdSlug = s => s.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');

/* Lien du document : renvoi vers un autre document servi, une ancre, ou un site externe. */
function mdHref(url, doc) {
  if (/^https?:\/\//.test(url)) return [url, true];
  const m = url.match(/^(?:([\w-]+)\.md)?(?:#(.*))?$/);
  const d = m && (m[1] || doc);
  if (!d || !RULES_DOCS[d]) return null;
  return [`#/regles/${d}${m[2] ? '/' + encodeURIComponent(m[2]) : ''}`, false];
}

function mdInline(s, doc) {
  const codes = [];
  return esc(s)
    .replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const h = mdHref(u.replace(/&amp;/g, '&'), doc);
      if (!h) return t;
      return `<a href="${esc(h[0])}"${h[1] ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^\w)*])\*(?=\S)([^*]*?[^\s*])\*(?![\w*])/g, '$1<i>$2</i>')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

/* Titres, paragraphes, listes imbriquées, tableaux, citations, code, et ancres <a id="…"></a>. */
function mdDoc(text, doc) {
  const out = [];
  const used = {};
  const lists = [];
  let para = [];
  let table = null;
  const inline = s => mdInline(s, doc);
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`); para = []; };
  const closeLists = (ind = -1) => {
    while (lists.length && lists[lists.length - 1].ind > ind) out.push(`</li></${lists.pop().tag}>`);
  };
  const flushTable = () => {
    if (!table) return;
    const cells = (row, tag) => '<tr>' + row.map(c => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>';
    const head = table.head ? `<thead>${cells(table.rows.shift(), 'th')}</thead>` : '';
    out.push(`<div class="tbl"><table>${head}<tbody>${table.rows.map(r => cells(r, 'td')).join('')}</tbody></table></div>`);
    table = null;
  };
  const flushAll = () => { flushPara(); closeLists(); flushTable(); };

  const lines = String(text).replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (/^```/.test(line)) {
      flushAll();
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
    } else if ((m = line.match(/^<a id="([\w-]+)"><\/a>\s*$/))) {
      flushAll();
      out.push(`<a id="r-${m[1]}"></a>`);
    } else if ((m = line.match(/^(#{1,6})\s+(.*?)\s*#*$/))) {
      flushAll();
      let id = mdSlug(m[2].replace(/[*`]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'));
      if (used[id] !== undefined) id += '-' + ++used[id]; else used[id] = 0;
      const h = m[1].length;
      out.push(`<h${h} id="r-${esc(id)}">${inline(m[2])}</h${h}>`);
    } else if (/^>/.test(line)) {
      flushAll();
      const quote = [line];
      while (i + 1 < lines.length && /^>/.test(lines[i + 1])) quote.push(lines[++i]);
      out.push(`<blockquote>${mdDoc(quote.map(l => l.replace(/^> ?/, '')).join('\n'), doc)}</blockquote>`);
    } else if ((m = line.match(/^\|(.*)\|\s*$/))) {
      flushPara(); closeLists();
      const row = m[1].split('|').map(c => c.trim());
      if (row.every(c => /^:?-*:?$/.test(c))) { if (table && table.rows.length === 1) table.head = true; continue; }
      if (!table) table = { rows: [], head: false };
      table.rows.push(row);
    } else if ((m = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)/))) {
      flushPara(); flushTable();
      const ind = m[1].length;
      const tag = /\d/.test(m[2]) ? 'ol' : 'ul';
      closeLists(ind);
      const top = lists[lists.length - 1];
      if (!top || ind > top.ind) {
        out.push(tag === 'ol' && +m[2] !== 1 ? `<ol start="${parseInt(m[2], 10)}">` : `<${tag}>`);
        lists.push({ ind, tag });
      } else if (top.tag !== tag) {
        out.push(`</li></${top.tag}><${tag}>`);
        top.tag = tag;
      } else out.push('</li>');
      out.push(`<li>${inline(m[3])}`);
    } else if (!line.trim()) {
      flushAll();
    } else if (lists.length && /^\s/.test(line)) {
      out.push(' ' + inline(line.trim()));
    } else {
      closeLists(); flushTable();
      para.push(line.trim());
    }
  }
  flushAll();
  return out.join('\n');
}
