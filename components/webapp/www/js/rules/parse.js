/* Lecture des documents de règles (references/COFv2/*.md) : produit le même modèle que
 * tools/drs/md2drs.py (drs.json), à garder synchronisés. Format des balises : references/COFv2/README.md. */

const RX_ANCHOR = /^<a id="([\w-]+)"><\/a>\s*$/;
const RX_HEADING = /^(#{1,6})\s+(.*?)\s*$/;
const RX_LABEL = /^\*\*([^*]+?)\s*:?\*\*\s*:?\s*(.*)$/;
const RX_CAP = /^\*\*(\d+)\. (.+?)\*\*(?: \(([^)]*)\))?\s*$/;
const RX_VARIANTE = /^\*\*Variante\*\* \(([\w-]+)\) : (.*?)(?: — (.+?))?\s*$/;
const RX_BONUS_RANG = /^\*\*Bonus rang (\d+)\*\* : (.*)$/;
const RX_LINK_ID = /\]\((?:[\w-]+\.md)?#([\w-]+)\)/;

const mdLines = text => String(text || '').replace(/\r/g, '').split('\n');
const mdTrim = lines => lines.join('\n').trim();
function mdLabel(line) {
  const m = line.match(RX_LABEL);
  return m ? [m[1].trim(), m[2].trim()] : null;
}

/* ---------- voies.md / prestige.md ---------- */
function parseVoies(text, prestige, out, warn) {
  let famille = '', voie = null, cap = null, vari = null, anchor = null, buf = [];
  const close = () => {
    if (cap) cap.text = mdTrim(buf);
    else if (vari) vari.note = mdTrim(buf);
    else if (voie) voie.intro = mdTrim(buf);
    cap = vari = null;
    buf = [];
  };
  const endVoie = () => { close(); voie = null; };
  for (const line of mdLines(text)) {
    let m = line.match(RX_ANCHOR);
    if (m) { anchor = m[1]; continue; }
    const h = line.match(RX_HEADING);
    if (h) {
      endVoie();
      if (anchor && anchor.startsWith('famille-')) famille = anchor.slice(8);
      else if (anchor && !anchor.startsWith('profil-')) {
        if (out[anchor]) warn(`voie « ${anchor} » définie deux fois`);
        voie = out[anchor] = { name: h[2], famille, prestige, intro: '', caps: [] };
      }
      anchor = null;
      continue;
    }
    anchor = null;
    if (!voie) continue;
    m = line.match(RX_CAP);
    if (m && !vari) {
      close();
      const tags = (m[3] || '').split(',').map(t => t.trim()).filter(Boolean);
      cap = { rang: +m[1], name: m[2], spell: tags.includes('sort'), action: tags.find(t => ['A', 'L', 'M', 'G'].includes(t)) || '', text: '', bonus: '' };
      voie.caps.push(cap);
      continue;
    }
    const lb = mdLabel(line);
    if (lb && lb[0] === 'Bonus' && cap) { cap.bonus = lb[1]; continue; }
    if (lb && lb[0] === 'Version standard') {
      close();
      (voie.variantes = voie.variantes || { std: '', list: [] }).std = lb[1];
      continue;
    }
    m = line.match(RX_VARIANTE);
    if (m) {
      close();
      vari = { id: m[1], name: m[2], voie: m[3] || '', note: '', bonus: {} };
      (voie.variantes = voie.variantes || { std: 'Standard', list: [] }).list.push(vari);
      continue;
    }
    m = line.match(RX_BONUS_RANG);
    if (m && vari) { vari.bonus[m[1]] = m[2].trim(); continue; }
    buf.push(line);
  }
  endVoie();
}

/* ---------- profils.md ---------- */
const PROFIL_FIELDS = {
  'PV niveau 1': 'pv1', 'PV par niveau': 'pvniv', 'Dé de récupération': 'dr', 'Points de chance': 'pc',
  'DR au niveau 1': 'drn', 'Caractéristiques clés': 'car', 'Caractéristique de magie': 'magie',
};
function parseProfils(text, warn) {
  const out = {};
  let famille = '', pr = null, anchor = null, mode = '';
  for (const line of mdLines(text)) {
    let m = line.match(RX_ANCHOR);
    if (m) { anchor = m[1]; continue; }
    const h = line.match(RX_HEADING);
    if (h) {
      pr = null;
      if (anchor && anchor.startsWith('famille-')) famille = anchor.slice(8);
      else if (anchor) {
        pr = out[anchor] = { name: h[2], famille, desc: '', pv1: '', pvniv: '', dr: '', drn: '', pc: '', car: '', magie: '', bonus: [], armes: '', equipement: '', extra: '', voies: [] };
        mode = '';
      }
      anchor = null;
      continue;
    }
    anchor = null;
    if (!pr || !line.trim()) {
      if (pr && (mode === 'armes' || mode === 'equipement')) mode = '';
      continue;
    }
    if (line.startsWith('>')) {
      pr.extra = (mode === 'extra' ? pr.extra + '\n' : '') + line.replace(/^> ?/, '');
      mode = 'extra';
      continue;
    }
    if (line.startsWith('**Armes & armures.**')) { pr.armes = line.slice(20).trim(); mode = 'armes'; continue; }
    if (line.startsWith('**Équipement de départ.**')) { pr.equipement = line.slice(25).trim(); mode = 'equipement'; continue; }
    if (line.startsWith('**Voies :**')) { mode = 'voies'; continue; }
    if (mode === 'voies' && line.startsWith('- ')) {
      m = line.match(RX_LINK_ID);
      if (m) pr.voies.push(m[1]); else warn(`profil « ${pr.name} » : voie sans lien (${line.slice(2, 40)}…)`);
      continue;
    }
    if (mode === 'armes' || mode === 'equipement') { pr[mode] += ' ' + line.trim(); continue; }
    if (line.startsWith('- ')) {
      const parts = line.slice(2).split(' · ').map(p => mdLabel(p.trim()));
      if (parts.length && parts.every(p => p && PROFIL_FIELDS[p[0]])) {
        for (const [k, v0] of parts) {
          const v = v0 === '—' || v0 === '-' ? '' : v0;
          pr[PROFIL_FIELDS[k]] = k === 'PV par niveau' ? v.replace(/\s*\+\s*CON$/, '') : v;
        }
      } else pr.bonus.push(line.slice(2));
      continue;
    }
    if (!pr.desc && line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) pr.desc = line.slice(1, -1);
  }
  return out;
}

/* ---------- peuples.md ---------- */
function parsePeuples(text) {
  const out = {};
  let pe = null, anchor = null, body = [];
  const close = () => { if (pe) pe.body = mdTrim(body); };
  for (const line of mdLines(text)) {
    const m = line.match(RX_ANCHOR);
    if (m) { anchor = m[1]; continue; }
    const h = line.match(RX_HEADING);
    if (h && h[1].length <= 2) {
      close();
      pe = null; body = [];
      if (anchor) pe = out[anchor] = { name: h[2], body: '', voies: [] };
      anchor = null;
      continue;
    }
    anchor = null;
    if (!pe) continue;
    if (line.startsWith('**Voie(s) :**')) { pe.voies = [...line.matchAll(new RegExp(RX_LINK_ID, 'g'))].map(x => x[1]); continue; }
    body.push(line);
  }
  close();
  return out;
}

/* ---------- familles.md ---------- */
function parseFamilles(text) {
  const out = {};
  let fa = null, anchor = null;
  for (const line of mdLines(text)) {
    const m = line.match(RX_ANCHOR);
    if (m) { anchor = m[1]; continue; }
    const h = line.match(RX_HEADING);
    if (h) {
      fa = null;
      if (anchor && anchor.startsWith('famille-')) fa = out[anchor.slice(8)] = { name: h[2], note: '', r2niv1: false, alt: '' };
      anchor = null;
      continue;
    }
    anchor = null;
    const lb = fa ? mdLabel(line) : null;
    if (!lb) continue;
    if (lb[0] === 'Particularité') fa.note = lb[1];
    else if (lb[0] === 'Rang 2 dès le niveau 1') fa.r2niv1 = ['oui', 'yes', '1', 'vrai'].includes(fold(lb[1]));
    else if (lb[0] === 'Voie remplaçant la voie de peuple') { const l = lb[1].match(RX_LINK_ID); fa.alt = l ? l[1] : ''; }
  }
  return out;
}

/* ---------- tableaux (regles.md, equipement.md) ---------- */
function mdTables(text) {
  const out = [];
  let title = '', cur = null;
  for (const line of mdLines(text)) {
    const h = line.match(RX_HEADING);
    if (h) title = h[2];
    const m = line.match(/^\|(.*)\|\s*$/);
    if (!m) { cur = null; continue; }
    const cells = m[1].split('|').map(c => c.trim());
    if (cells.every(c => /^:?-*:?$/.test(c))) continue;
    if (!cur) { cur = { title, head: cells, rows: [] }; out.push(cur); } else cur.rows.push(cells);
  }
  return out;
}
const mdCell = c => { const s = String(c || '').replace(/\*\*|`/g, '').trim(); return ['—', '–', '-'].includes(s) ? '' : s; };
const mdNum = c => { const m = String(c || '').replace(/−/g, '-').match(/[-+]?\d+/); return m ? parseInt(m[0], 10) : 0; };

function parseRegles(text, out) {
  for (const { head, rows } of mdTables(text)) {
    const h0 = fold(head[0]);
    if (h0 === 'etat') out.etats = rows.map(r => ({ name: mdCell(r[0]), effet: mdCell(r[1]) }));
    else if (h0 === 'serie') out.series = rows.map(r => ({ name: mdCell(r[0]), valeurs: mdCell(r[1]) }));
    else if (h0 === 'rang') {
      const row = rows.find(r => fold(mdCell(r[0])) === 'niveau requis');
      if (row) out.niveaux = Object.fromEntries(head.slice(1).map((k, i) => [mdCell(k), mdNum(row[i + 1])]));
    } else if (h0.startsWith('ideal')) {
      out.ideaux = rows.map(r => mdCell(r[0])).filter(Boolean);
      out.travers = rows.filter(r => r.length > 1).map(r => mdCell(r[1])).filter(Boolean);
    }
  }
}

function parseEquipement(text, out, warn) {
  out.armes = []; out.armures = []; out.boucliers = [];
  for (const { title, head, rows } of mdTables(text)) {
    const cols = head.map(fold);
    const col = (r, name) => (cols.includes(name) && cols.indexOf(name) < r.length ? mdCell(r[cols.indexOf(name)]) : '');
    const kind = cols[0];
    for (const r of rows) {
      const name = col(r, kind).replace(/\s*[¹²³⁴#*]+$/, '');
      const id = col(r, 'id');
      if (['arme', 'armure', 'bouclier'].includes(kind) && !id) { warn(`${kind} « ${name} » sans Id : ignorée`); continue; }
      if (kind === 'arme') {
        const crit = col(r, 'critique');
        out.armes.push({
          id, name, att: fold(title).includes('distance') ? 'distance' : 'contact',
          dm: col(r, 'dm'), portee: mdNum(col(r, 'portee')), crit: crit ? mdNum(crit) : 20,
          prix: col(r, 'prix'), type: col(r, 'type'),
          mots: col(r, 'mots-cles').split(',').map(x => x.trim()).filter(Boolean), notes: col(r, 'notes'),
        });
      } else if (kind === 'armure') out.armures.push({ id, name, def: mdNum(col(r, 'def')), agi: mdNum(col(r, 'agi max')), prix: col(r, 'prix') });
      else if (kind === 'bouclier') out.boucliers.push({ id, name, def: mdNum(col(r, 'def')), prix: col(r, 'prix') });
    }
  }
}

/* Modèle complet à partir des textes { doc: markdown }. warn(message) reçoit les incohérences. */
function parseRules(texts, warn = () => {}) {
  const out = {
    source: 'https://drs.chroniques-oubliees.fr/fantasy', familles: parseFamilles(texts.familles),
    profils: parseProfils(texts.profils, warn), peuples: parsePeuples(texts.peuples), voies: {},
  };
  parseVoies(texts.voies, false, out.voies, warn);
  parseVoies(texts.prestige, true, out.voies, warn);
  parseRegles(texts.regles, out);
  parseEquipement(texts.equipement, out, warn);
  for (const kind of ['profils', 'peuples']) {
    for (const [k, o] of Object.entries(out[kind])) {
      for (const v of o.voies) if (!out.voies[v]) warn(`${kind.slice(0, -1)} « ${k} » : voie inconnue « ${v} »`);
    }
  }
  return out;
}
