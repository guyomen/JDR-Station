/* Règles de la table (MJ, onglet Outils) : télécharger les documents, envoyer des documents modifiés
 * (vérifiés ici avant l'envoi), revenir aux documents d'origine. La station prévient alors tous les
 * appareils, qui rechargent l'appli avec les nouvelles règles. */

/* Documents remplacés sur la station : { doc: octets } ; null tant que /regles/index.json n'a pas répondu. */
function refreshRulesIndex() {
  fetch('/regles/index.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(idx => {
      RULES.custom = Object.fromEntries(Object.entries(idx).map(([name, size]) => [name.replace(/\.md$/, ''), size]));
      paintRulesAdmin();
    })
    .catch(() => {});
}
function paintRulesAdmin() {
  const el = $('[data-rules-admin]');
  if (el) el.innerHTML = rulesAdminHTML();
}

/* ---------- Téléchargement : un document, ou tous dans un .zip ---------- */
function saveFile(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = bytes => { let c = -1; for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };

/* Archive .zip sans compression (format « stored ») : [{ name, text }]. */
function zipFiles(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const head = (sig, extra) => {
      const b = new DataView(new ArrayBuffer(extra ? 46 : 30));
      let p = 0;
      const u32 = v => { b.setUint32(p, v, true); p += 4; }, u16 = v => { b.setUint16(p, v, true); p += 2; };
      u32(sig); if (extra) u16(20); u16(20); u16(0x0800); u16(0); u16(0); u16(0x21);   // version, UTF-8, stocké, date 1980-01-01
      u32(crc); u32(data.length); u32(data.length); u16(name.length); u16(0);
      if (extra) { u16(0); u16(0); u16(0); u32(0); u32(offset); }
      return new Uint8Array(b.buffer);
    };
    const local = head(0x04034b50, false);
    parts.push(local, name, data);
    central.push(head(0x02014b50, true), name);
    offset += local.length + name.length + data.length;
  }
  const size = central.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

function downloadRules(doc) {
  if (doc && doc !== 'all') return saveFile(`${doc}.md`, new Blob([RULES.texts[doc] || ''], { type: 'text/markdown' }));
  const files = Object.keys(RULES_DOCS).map(d => ({ name: `${d}.md`, text: RULES.texts[d] || '' }));
  saveFile(`regles-jdr-station-${new Date().toISOString().slice(0, 10)}.zip`, zipFiles(files));
}

/* ---------- Envoi : lecture des fichiers choisis, rapport, puis envoi ---------- */
/* Différences entre deux modèles : { voies: { ajout: [], retrait: [], modif: [] }, … } (noms affichés). */
function rulesDiff(a, b) {
  const out = {};
  const sets = {
    voies: [a.voies, b.voies], profils: [a.profils, b.profils], peuples: [a.peuples, b.peuples], familles: [a.familles, b.familles],
    armes: [Object.fromEntries(a.armes.map(x => [x.id, x])), Object.fromEntries(b.armes.map(x => [x.id, x]))],
    armures: [Object.fromEntries([...a.armures, ...a.boucliers].map(x => [x.id, x])), Object.fromEntries([...b.armures, ...b.boucliers].map(x => [x.id, x]))],
  };
  for (const [k, [x, y]] of Object.entries(sets)) {
    const label = (o, id) => (o[id] && o[id].name) || id;
    const d = {
      ajout: Object.keys(y).filter(id => !x[id]).map(id => label(y, id)),
      retrait: Object.keys(x).filter(id => !y[id]).map(id => label(x, id)),
      modif: Object.keys(y).filter(id => x[id] && JSON.stringify(x[id]) !== JSON.stringify(y[id])).map(id => label(y, id)),
    };
    if (d.ajout.length || d.retrait.length || d.modif.length) out[k] = d;
  }
  for (const k of ['etats', 'series', 'niveaux', 'ideaux', 'travers']) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out[k] = { ajout: [], retrait: [], modif: ['liste modifiée'] };
  }
  return out;
}

async function pickRulesFiles(files) {
  const texts = { ...RULES.texts };
  const changed = [], unknown = [];
  for (const f of files) {
    const doc = f.name.toLowerCase().replace(/\.md$/, '');
    if (!RULES_DOCS[doc]) { unknown.push(f.name); continue; }
    const text = (await f.text()).replace(/\r\n?/g, '\n');
    if (text !== RULES.texts[doc]) { texts[doc] = text; changed.push(doc); }
  }
  if (unknown.length) toast(`Ignoré : ${unknown.join(', ')} (noms attendus : ${Object.keys(RULES_DOCS).map(d => d + '.md').join(', ')})`);
  if (!changed.length) { if (!unknown.length) toast('Aucun changement par rapport aux règles en vigueur'); return; }
  const r = readRules(texts);
  if (!r.error) {
    try { buildRules(r.model, w => r.warnings.push(w)); } catch (e) { r.error = e.message; }
  }
  S.rulesDraft = { texts, changed, error: r.error, warnings: r.warnings, diff: r.error ? {} : rulesDiff(RULES.model, r.model), model: r.model };
  paintRulesAdmin();
}

async function gzipText(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Blob([await new Response(stream).arrayBuffer()]);
}
async function sendRules() {
  const d = S.rulesDraft;
  if (!d || d.error) return;
  if (typeof CompressionStream === 'undefined') { toast('Navigateur trop ancien pour envoyer des règles (compression indisponible)'); return; }
  S.rulesBusy = true;
  paintRulesAdmin();
  try {
    /* Tous les documents sauf le dernier portent « X-Suite » : la station ne prévient la table qu'à la fin. */
    for (const [i, doc] of d.changed.entries()) {
      const headers = { 'X-Pin': S.pin, ...(i < d.changed.length - 1 ? { 'X-Suite': '1' } : {}) };
      const r = await fetch(`/regles/${doc}.md`, { method: 'PUT', headers, body: await gzipText(d.texts[doc]) });
      if (!r.ok) throw new Error(`${doc}.md : ${await r.text()}`);
    }
    S.rulesDraft = null;
    toast('Règles envoyées : la table passe aux nouvelles règles');
  } catch (e) {
    toast(`Échec de l’envoi — ${e.message}`);
  }
  S.rulesBusy = false;
  refreshRulesIndex();
  paintRulesAdmin();
}

async function resetRules(doc) {
  const docs = doc === 'all' ? Object.keys(RULES.custom || {}) : [doc];
  if (!docs.length) return;
  const what = doc === 'all' ? 'tous les documents de la table' : `${doc}.md`;
  if (!confirm(`Revenir aux règles d’origine pour ${what} ? Les modifications de la table seront perdues (pensez à les télécharger avant).`)) return;
  try {
    S.rulesBusy = true;
    for (const [i, d] of docs.entries()) {
      const headers = { 'X-Pin': S.pin, ...(i < docs.length - 1 ? { 'X-Suite': '1' } : {}) };
      const r = await fetch(`/regles/${d}.md`, { method: 'DELETE', headers });
      if (!r.ok) throw new Error(await r.text());
    }
    toast('Règles d’origine rétablies');
  } catch (e) {
    toast(`Échec — ${e.message}`);
  }
  S.rulesBusy = false;
  refreshRulesIndex();
}

/* ---------- Carte de l'onglet Outils ---------- */
const DIFF_LABEL = { voies: 'Voies', profils: 'Profils', peuples: 'Peuples', familles: 'Familles', armes: 'Armes', armures: 'Armures et boucliers',
  etats: 'États', series: 'Séries de caractéristiques', niveaux: 'Niveaux requis', ideaux: 'Idéaux', travers: 'Travers' };

function rulesDraftHTML(d) {
  const lines = Object.entries(d.diff).map(([k, x]) => `<li><b>${DIFF_LABEL[k] || k}</b> : ${[
    x.ajout.length && `ajout de ${x.ajout.map(esc).join(', ')}`,
    x.retrait.length && `retrait de ${x.retrait.map(esc).join(', ')}`,
    x.modif.length && `modification de ${x.modif.map(esc).join(', ')}`,
  ].filter(Boolean).join(' ; ')}</li>`).join('');
  const m = d.model;
  return `<div class="draft">
    <p><b>Documents modifiés :</b> ${d.changed.map(x => esc(x) + '.md').join(', ')}</p>
    ${d.error ? `<p class="warn">Règles inutilisables : ${esc(d.error)}. Rien ne sera envoyé.</p>` : `
      <p class="small muted">${Object.keys(m.voies).length} voies · ${Object.keys(m.profils).length} profils · ${Object.keys(m.peuples).length} peuples ·
        ${m.armes.length} armes · ${m.armures.length} armures · ${(m.etats || []).length} états</p>
      ${lines ? `<ul class="small">${lines}</ul>` : '<p class="small muted">Textes modifiés seulement (rien qui change la fiche).</p>'}`}
    ${d.warnings.length ? `<details class="small" open><summary class="warn">${d.warnings.length} point(s) à vérifier</summary><ul>${d.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>` : ''}
    <div class="row">
      ${d.error ? '' : `<button class="btn" data-a="rules-send"${S.rulesBusy ? ' disabled' : ''}>${S.rulesBusy ? 'Envoi…' : '⬆ Envoyer à la station'}</button>`}
      <button data-a="rules-cancel"${S.rulesBusy ? ' disabled' : ''}>Annuler</button>
    </div>
  </div>`;
}

function rulesAdminHTML() {
  const custom = RULES.custom || {};
  const docs = Object.entries(RULES_DOCS).map(([d, label]) => `<li>
      <span class="grow"><b>${label}</b> <small class="muted">${d}.md</small></span>
      ${custom[d] != null ? `<span class="badge on">de la table · ${Math.ceil(custom[d] / 1024)} Ko</span>
        <button class="sm" data-a="rules-reset" data-v="${d}" title="Revenir au document d’origine">↺</button>` : '<span class="badge">origine</span>'}
      <button class="sm" data-a="rules-dl" data-v="${d}" title="Télécharger ce document">⬇</button>
    </li>`).join('');
  return `
    ${RULES.origine ? '<p class="warn small">Les documents de la table sont inutilisables : la partie utilise les règles d’origine. Corrigez-les ou revenez aux documents d’origine.</p>' : ''}
    <ul class="rulesdocs">${docs}</ul>
    <div class="row">
      <button data-a="rules-dl" data-v="all">⬇ Tout télécharger (.zip)</button>
      <label class="btn ghost">⬆ Envoyer des .md modifiés<input type="file" accept=".md,text/markdown,text/plain" multiple data-rules-upload hidden></label>
      ${Object.keys(custom).length ? '<button class="sm danger" data-a="rules-reset" data-v="all">Tout remettre d’origine</button>' : ''}
    </div>
    ${S.rulesDraft ? rulesDraftHTML(S.rulesDraft) : ''}
    ${RULES.warnings.length ? `<details class="small"><summary>${RULES.warnings.length} point(s) à vérifier dans les règles en vigueur</summary><ul>${RULES.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>` : ''}`;
}
