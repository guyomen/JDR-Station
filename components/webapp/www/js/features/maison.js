/* Contenu maison (MJ) : voies, profils et peuples ajoutés par la table dans une section « # Contenu maison »
 * en fin de voies.md, prestige.md, profils.md et peuples.md. Le contenu d'origine n'est jamais modifié.
 * Lecture avec parse.js, écriture ici (format : references/COFv2/README.md), relecture de contrôle à chaque
 * validation ; l'envoi passe par celui des règles de la table (rules_admin.js). */

const MAISON_TITLE = '# Contenu maison';
const RX_MAISON = /^# Contenu maison\s*$/m;
const MAISON_DOCS = { voie: ['voies', 'prestige'], profil: ['profils'], peuple: ['peuples'] };
const MAISON_KEY = { voie: 'voies', profil: 'profils', peuple: 'peuples' }; // clé du modèle de parseRules()
const MAISON_LABEL = { voie: 'Voies', profil: 'Profils', peuple: 'Peuples' };

/* Texte d'un document coupé en [origine, section maison]. */
function maisonSplit(text) {
  const t = String(text || '');
  const m = t.match(RX_MAISON);
  return m ? [t.slice(0, m.index).trimEnd(), t.slice(m.index + m[0].length)] : [t.trimEnd(), ''];
}

const mdOne = s => String(s || '').replace(/\s*\n\s*/g, ' ').trim();            // texte sur une ligne
const mdBlock = s => String(s || '').replace(/\r/g, '').trim();                  // texte sur plusieurs lignes
/* Contenu maison masqué sur les fiches tant que le MJ ne l'a pas activé (option de partie « maison »). */
const maisonMasque = (kind, id) => !S.opts.maison && RULES.maison[kind].has(id);

const maisonFam = f => (f === 'peuple' ? 'Voies de peuple' : (COF2.familles[f] || {}).n || f);

/* ---------- Lecture : entrées de la section maison, sous la forme du formulaire ---------- */
function maisonRead(texts) {
  const out = { voie: [], profil: [], peuple: [] };
  for (const doc of MAISON_DOCS.voie) {
    const voies = {};
    parseVoies(maisonSplit(texts[doc])[1], doc === 'prestige', voies, () => {});
    for (const [id, v] of Object.entries(voies)) {
      out.voie.push({
        id, doc, name: v.name, famille: v.famille, intro: v.intro, variantes: v.variantes,
        caps: v.caps.map(c => ({ name: c.name, spell: c.spell, action: c.action, text: c.text, bonus: c.bonus })),
      });
    }
  }
  for (const [id, p] of Object.entries(parseProfils(maisonSplit(texts.profils)[1], () => {}))) {
    out.profil.push({ id, ...p, bonus: p.bonus.join('\n') });
  }
  for (const [id, p] of Object.entries(parsePeuples(maisonSplit(texts.peuples)[1]))) {
    /* Corps : description, puis sections ### ; « Caractéristiques » a son champ, les autres restent ensemble. */
    const parts = p.body.split(/\n(?=### )/);
    const head = parts[0].startsWith('### ') ? '' : parts.shift();
    const car = parts.find(s => /^### Caractéristiques\s*(\n|$)/.test(s));
    out.peuple.push({
      id, name: p.name, desc: head.trim(), voies: p.voies,
      car: car ? car.replace(/^### Caractéristiques\s*/, '').trim() : '',
      autres: parts.filter(s => s !== car).join('\n').trim(),
    });
  }
  return out;
}

/* Forme canonique d'une saisie : celle que redonne la lecture du texte écrit. */
function maisonNorm(kind, e) {
  const val = s => (['—', '–', '-'].includes(mdOne(s)) ? '' : mdOne(s));
  if (kind === 'voie') {
    return { ...e, name: mdOne(e.name), intro: mdBlock(e.intro),
      caps: e.caps.map(c => ({ name: mdOne(c.name), spell: !!c.spell, action: c.action || '', text: mdBlock(c.text), bonus: mdOne(c.bonus) })) };
  }
  if (kind === 'profil') {
    /* PV, DR et points de chance viennent de la famille (familles.md) : jamais écrits dans le profil. */
    return { ...e, name: mdOne(e.name), desc: mdOne(e.desc), pv1: '', pvniv: '', dr: '', pc: '', drn: '', car: val(e.car), magie: val(e.magie),
      bonus: mdLines(e.bonus).map(l => l.trim().replace(/^- /, '')).filter(Boolean).join('\n'),
      armes: mdOne(e.armes), equipement: mdOne(e.equipement), extra: mdBlock(e.extra) };
  }
  return { ...e, name: mdOne(e.name), desc: mdBlock(e.desc), car: mdBlock(e.car), autres: mdBlock(e.autres) };
}

/* ---------- Écriture (entrées déjà normalisées) ---------- */
/* Lien vers une voie (le résumé de ses capacités est ajouté à l'affichage, cf. voieResume). */
function maisonVoieLink(id, model) {
  const v = model.voies[id];
  return v ? `[${v.name}](${v.prestige ? 'prestige' : 'voies'}.md#${id})` : `[${id}](voies.md#${id})`;
}

function maisonWriteVoie(v) {
  const out = [`<a id="${v.id}"></a>`, `### ${v.name}`, ''];
  if (v.intro) out.push(v.intro, '');
  v.caps.forEach((c, i) => {
    const tags = [c.spell && 'sort', c.action].filter(Boolean).join(', ');
    out.push(`**${(v.doc === 'prestige' ? 4 : 1) + i}. ${c.name}**${tags ? ` (${tags})` : ''}`, '');
    if (c.text) out.push(c.text, '');
    if (c.bonus) out.push(`**Bonus** : ${c.bonus}`, '');
  });
  const va = v.variantes;
  if (va && va.list.length) {
    out.push(`**Version standard** : ${va.std}`, '');
    for (const o of va.list) {
      out.push(`**Variante** (${o.id}) : ${o.name}${o.voie ? ` — ${o.voie}` : ''}`, '');
      if (o.note) out.push(o.note, '');
      for (const [r, b] of Object.entries(o.bonus || {})) out.push(`**Bonus rang ${r}** : ${b}`, '');
    }
  }
  return out;
}

function maisonWriteProfil(p, model) {
  const val = s => s || '—';
  const out = [`<a id="${p.id}"></a>`, `### ${p.name}`, ''];
  if (p.desc) out.push(`*${p.desc}*`, '');
  out.push(`- **Caractéristiques clés** : ${val(p.car)} · **Caractéristique de magie** : ${val(p.magie)}`);
  if (p.bonus) out.push(...mdLines(p.bonus).map(l => `- ${l}`));
  out.push('');
  if (p.armes) out.push(`**Armes & armures.** ${p.armes}`, '');
  if (p.equipement) out.push(`**Équipement de départ.** ${p.equipement}`, '');
  if (p.extra) out.push(...mdLines(p.extra).map(l => (l.trim() ? '> ' + l : '>')), '');
  if (p.voies.length) out.push('**Voies :**', '', ...p.voies.map(id => `- ${maisonVoieLink(id, model)}`), '');
  return out;
}

function maisonWritePeuple(p, model) {
  const out = [`<a id="${p.id}"></a>`, `## ${p.name}`, ''];
  if (p.desc) out.push(p.desc, '');
  out.push('### Caractéristiques', '');
  if (p.car) out.push(p.car, '');
  if (p.autres) out.push(p.autres, '');
  if (p.voies.length) out.push(`**Voie(s) :** ${p.voies.map(id => maisonVoieLink(id, model)).join(', ')}`, '');
  return out;
}

/* Section maison d'un document : entrées regroupées par famille (voies, profils), ou à la suite (peuples). */
function maisonSection(doc, list, model) {
  if (!list.length) return '';
  const out = [MAISON_TITLE, ''];
  if (doc === 'peuples') list.forEach(p => out.push(...maisonWritePeuple(p, model)));
  else {
    for (const f of [...new Set(list.map(e => e.famille))]) {
      out.push(`<a id="famille-${f}"></a>`, `## ${maisonFam(f)}`, '');
      list.filter(e => e.famille === f).forEach(e => out.push(...(doc === 'profils' ? maisonWriteProfil(e, model) : maisonWriteVoie(e))));
    }
  }
  return out.join('\n').trimEnd();
}

/* Documents réécrits avec les entrées maison données (toutes, par type) : { doc: texte }. */
function maisonWrite(texts, entries, model) {
  const out = {};
  for (const [kind, docs] of Object.entries(MAISON_DOCS)) {
    for (const doc of docs) {
      const list = entries[kind].filter(e => kind !== 'voie' || e.doc === doc).map(e => maisonNorm(kind, e));
      const section = maisonSection(doc, list, model);
      out[doc] = maisonSplit(texts[doc])[0] + '\n' + (section ? '\n' + section + '\n' : '');
    }
  }
  return out;
}

/* Réécriture complète ; si une voie change, une seconde passe met à jour le nom des liens des profils et
 * peuples maison qui la citent. */
function maisonRewrite(texts, entries, model, kind) {
  const out = { ...texts, ...maisonWrite(texts, entries, model) };
  return kind === 'voie' ? { ...out, ...maisonWrite(out, entries, readRules(out).model) } : out;
}

/* ---------- Contrôles d'une entrée ---------- */
const RX_MAISON_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/* Identifiant proposé à partir du nom : « Voie de l'ombre » → « ombre ». */
const maisonSlug = name => fold(name).replace(/^voie (de la |du |des |de l'|de l’|d'|d’|de )?/, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Erreurs bloquantes (liste vide si l'entrée est acceptable). */
function maisonCheck(kind, e, orig, model) {
  const err = [];
  if (!mdOne(e.name)) err.push('Le nom est obligatoire.');
  if (!RX_MAISON_ID.test(e.id || '')) err.push('Identifiant : minuscules, chiffres et tirets seulement.');
  else if (/^(famille|profil)-/.test(e.id)) err.push('Identifiant : « famille-… » et « profil-… » sont réservés.');
  else if (e.id !== orig && model[MAISON_KEY[kind]][e.id]) err.push(`L’identifiant « ${e.id} » est déjà utilisé.`);
  /* Un titre ou une ancre dans un texte couperait l'entrée en deux. */
  const free = kind === 'voie' ? [e.intro, ...e.caps.map(c => c.text)] : kind === 'profil' ? [e.extra] : [e.desc, e.car, e.autres];
  const rxHead = kind === 'peuple' ? /^(#{1,2}\s|<a id=)/m : /^(#{1,6}\s|<a id=)/m;
  if (free.some(t => rxHead.test(String(t || '')))) {
    err.push(kind === 'peuple' ? 'Textes : titres # et ## interdits (### permis), pas d’ancre.' : 'Textes : pas de titre (#) ni d’ancre.');
  }
  if (kind === 'voie' && e.caps.some(c => !mdOne(c.name))) err.push('Chaque capacité doit avoir un nom.');
  return err;
}

/* Comparaison souple d'une entrée et de sa relecture (bords des lignes et lignes vides ignorés). */
function maisonSame(a, b) {
  const norm = v => (Array.isArray(v) ? v.map(norm)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).filter(k => k !== 'variantes').sort().map(k => [k, norm(v[k])]))
      : typeof v === 'string' ? v.split('\n').map(l => l.trim()).filter(Boolean).join('\n') : v);
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/* ---------- État de l'écran (S.maison) ---------- */
/* Copie de travail des documents en vigueur ; modèle et avertissements recalculés à chaque changement. */
function maisonOpen() {
  if (!S.maison) S.maison = { texts: { ...RULES.texts }, model: RULES.model, warnings: [], edit: null, err: [] };
  return S.maison;
}
function maisonSet(texts) {
  const r = readRules(texts);
  if (!r.error) {
    try { buildRules(r.model, w => r.warnings.push(w)); } catch (e) { r.error = e.message; }
  }
  Object.assign(S.maison, { texts, model: r.model, warnings: r.error ? [`Règles inutilisables : ${r.error}`, ...r.warnings] : r.warnings });
  S.rulesDraft = null;
}
const maisonChanged = () => (S.maison ? Object.keys(RULES_DOCS).filter(d => S.maison.texts[d] !== RULES.texts[d]) : []);

function maisonBlank(kind) {
  if (kind === 'voie') {
    return { id: '', doc: 'voies', famille: maisonFamilles('voie', 'voies')[0][0], name: '', intro: '',
      caps: [0, 1, 2, 3, 4].map(() => ({ name: '', spell: false, action: '', text: '', bonus: '' })) };
  }
  if (kind === 'profil') {
    return { id: '', famille: maisonFamilles('profil')[0][0], name: '', desc: '', pv1: '', pvniv: '', dr: '', pc: '', drn: '',
      car: '', magie: '', bonus: '', armes: '', equipement: '', extra: '', voies: [] };
  }
  return { id: '', name: '', desc: '', car: '', autres: '', voies: [] };
}
function maisonEdit(kind, id) {
  const M = maisonOpen();
  const e = id ? maisonRead(M.texts)[kind].find(x => x.id === id) : maisonBlank(kind);
  if (!e) return;
  M.edit = { kind, orig: id || '', auto: !id, data: JSON.parse(JSON.stringify(e)) };
  M.err = [];
}

/* Valide l'entrée en cours : contrôles, écriture, puis relecture qui doit redonner la même entrée. */
function maisonApply() {
  const M = S.maison;
  const { kind, orig, data } = M.edit;
  const err = maisonCheck(kind, data, orig, M.model);
  if (err.length) { M.err = err; return false; }
  const entries = maisonRead(M.texts);
  const i = orig ? entries[kind].findIndex(x => x.id === orig) : -1;
  if (i >= 0) entries[kind][i] = data; else entries[kind].push(data);
  const texts = maisonRewrite(M.texts, entries, M.model, kind);
  const back = maisonRead(texts)[kind].find(x => x.id === data.id);
  if (!back || !maisonSame(maisonNorm(kind, data), back)) {
    M.err = ['La relecture ne redonne pas la saisie : une ligne d’un texte ressemble sans doute à une balise (**1. …**, **Bonus** : …, **Voies :**…).'];
    return false;
  }
  maisonSet(texts);
  M.edit = null;
  M.err = [];
  return true;
}

function maisonDelete(kind, id) {
  const M = maisonOpen();
  const entries = maisonRead(M.texts);
  const e = entries[kind].find(x => x.id === id);
  if (!e) return;
  const used = S.chars.filter(c => (kind === 'voie' ? c.voies.some(v => v.id === id) : c[kind] === id)).map(c => c.name || 'Sans nom');
  if (!confirm(`Supprimer « ${e.name} » ?${used.length ? `\n\nAttention, utilisé par : ${used.join(', ')}.` : ''}`)) return;
  entries[kind] = entries[kind].filter(x => x.id !== id);
  maisonSet(maisonRewrite(M.texts, entries, M.model, kind));
  if (M.edit && M.edit.orig === id) M.edit = null;
}

/* Familles proposées : profils et voies de profil (familles ayant des profils, plus peuple), prestige (toutes). */
function maisonFamilles(kind, doc) {
  const all = Object.keys(COF2.familles);
  const list = kind === 'voie' && doc === 'prestige' ? all : all.filter(f => !familleOuverte(f));
  return [...list.map(f => [f, maisonFam(f)]), ...(kind === 'voie' && doc === 'voies' ? [['peuple', maisonFam('peuple')]] : [])];
}

/* Saisie dans le formulaire : data-m = chemin dans l'entrée, data-m-add = liste où ajouter la valeur choisie. */
function maisonField(el) {
  const ed = S.maison && S.maison.edit;
  if (!ed) return;
  if (el.dataset.mAdd) {
    const list = ed.data[el.dataset.mAdd];
    if (el.value && !list.includes(el.value)) list.push(el.value);
    return render();
  }
  const p = el.dataset.m;
  setPath(ed.data, p, el.type === 'checkbox' ? el.checked : el.value);
  if (p === 'id') ed.auto = false;
  if (p === 'name' && ed.auto) {
    ed.data.id = maisonSlug(el.value);
    const idEl = $('[data-m="id"]');
    if (idEl) idEl.value = ed.data.id;
  }
  /* Type de voie : familles et rangs proposés changent. */
  if (el.tagName === 'SELECT') {
    const fams = maisonFamilles(ed.kind, ed.data.doc);
    if (!fams.some(([k]) => k === ed.data.famille)) ed.data.famille = fams[0][0];
    render();
  }
}

/* Envoi : mêmes vérifications, rapport et envoi que des documents choisis par le MJ (rules_admin.js). */
function maisonSubmit() {
  const changed = maisonChanged();
  if (!changed.length) return toast('Aucun changement à envoyer');
  draftRules(S.maison.texts, changed);
}
