/* Vue : Contenu maison (MJ, #/mj/maison) : liste des voies, profils et peuples maison, formulaire d'une
 * entrée, puis vérification et envoi à la station (cf. features/maison.js). */

const MAISON_ACTIONS = [['', 'Aucune'], ['A', 'Attaque (A)'], ['L', 'Limitée (L)'], ['M', 'Mouvement (M)'], ['G', 'Gratuite (G)']];
const MAISON_NEW = { voie: 'Nouvelle voie', profil: 'Nouveau profil', peuple: 'Nouveau peuple' };

function viewMaison() {
  const M = maisonOpen();
  return `<p><a href="#/mj">‹ Espace MJ</a></p>
    ${M.edit ? maisonFormHTML(M) : maisonListHTML(M)}`;
}

function maisonListHTML(M) {
  const entries = maisonRead(M.texts);
  const sub = (kind, e) => (kind === 'voie' ? `${e.doc === 'prestige' ? 'prestige' : 'voie'} · ${maisonFam(e.famille)}`
    : kind === 'profil' ? maisonFam(e.famille) : `${e.voies.length} voie(s)`);
  const list = kind => `<h3>${MAISON_LABEL[kind]}</h3>
    ${entries[kind].length ? `<ul class="rulesdocs">${entries[kind].map(e => `<li>
        <span class="grow"><b>${esc(e.name)}</b> <small class="muted">${esc(e.id)} · ${esc(sub(kind, e))}</small></span>
        <button class="sm" data-a="maison-edit" data-kind="${kind}" data-v="${esc(e.id)}" title="Modifier">✎</button>
        <button class="sm danger" data-a="maison-del" data-kind="${kind}" data-v="${esc(e.id)}" title="Supprimer">✕</button>
      </li>`).join('')}</ul>` : '<p class="muted small">Aucun pour l’instant.</p>'}
    <button class="sm" data-a="maison-edit" data-kind="${kind}">+ ${MAISON_NEW[kind]}</button>`;
  const changed = maisonChanged();
  return `<section class="card"><h2>Contenu maison</h2>
      <p class="muted small">Voies, profils et peuples propres à la table. Ils s’ajoutent à la fin des documents de règles
        (section « Contenu maison ») sans toucher aux règles d’origine, et apparaissent dans l’Espace Règles et sur les fiches.
        Les familles ne changent pas. Une voie qui n’est dans la liste d’aucun profil ni peuple est proposée dans « Autres voies ».</p>
      ${maisonOptHTML()}
      ${['voie', 'profil', 'peuple'].map(list).join('')}
    </section>
    <section class="card"><h3>Envoi à la station</h3>
      ${changed.length ? `<p>Documents modifiés : ${changed.map(d => esc(d) + '.md').join(', ')}</p>
        <div class="row"><button class="btn" data-a="maison-submit">Vérifier et envoyer…</button>
          <button class="sm danger" data-a="maison-reset">Abandonner les modifications</button></div>`
        : '<p class="muted small">Aucune modification en attente.</p>'}
      ${M.warnings.length ? `<details class="small" open><summary class="warn">${M.warnings.length} point(s) à vérifier</summary><ul>${M.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>` : ''}
      ${S.rulesDraft ? rulesDraftHTML(S.rulesDraft) : ''}
      <p class="muted small">Après l’envoi, tous les appareils rechargent l’appli avec les nouvelles règles. Les fichiers restent
        téléchargeables depuis Outils › Règles de la table.</p>
    </section>`;
}

/* Option de partie : contenu maison proposé sur les fiches (désactivé par défaut). */
function maisonOptHTML() {
  const nb = ['voie', 'profil', 'peuple'].reduce((s, k) => s + RULES.maison[k].size, 0);
  return `<label class="chk"><input type="checkbox" data-a="opts-maison"${S.opts.maison ? ' checked' : ''}>
      Proposer le contenu maison sur les fiches${nb ? ` (${nb} entrée(s) en vigueur)` : ''}</label>
    <p class="muted small">Désactivé, il n’apparaît plus dans les choix de peuple, de profil et de voie (les fiches qui l’utilisent déjà le gardent).</p>`;
}

/* ---------- Formulaire ---------- */
const mInput = (label, path, value, ph = '', attrs = '') => `<label class="mfield"><span>${label}</span>
  <input data-m="${path}" value="${esc(value)}" placeholder="${esc(ph)}"${attrs}></label>`;
const mArea = (label, path, value, ph = '', rows = 3) => `<label class="mfield"><span>${label}</span>
  <textarea data-m="${path}" rows="${rows}" placeholder="${esc(ph)}">${esc(value)}</textarea></label>`;
const mSelect = (label, path, value, opts) => `<label class="mfield"><span>${label}</span>
  <select data-m="${path}">${opts.map(([k, l]) => `<option value="${esc(k)}"${k === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;

function maisonFormHTML(M) {
  const { kind, orig, data: e } = M.edit;
  const body = kind === 'voie' ? maisonVoieForm(e) : kind === 'profil' ? maisonProfilForm(e, M.model) : maisonPeupleForm(e, M.model);
  return `<section class="card maison">
    <h2>${orig ? `Modifier : ${esc(e.name)}` : MAISON_NEW[kind]}</h2>
    <div class="mgrid">
      ${mInput('Nom', 'name', e.name, kind === 'voie' ? 'Voie de …' : '')}
      ${mInput('Identifiant', 'id', e.id, 'minuscules-et-tirets', orig ? ' readonly title="L’identifiant d’un élément existant ne change pas : les fiches s’en servent."' : '')}
    </div>
    ${body}
    ${M.err.length ? `<ul class="warn small">${M.err.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <div class="row">
      <button class="btn" data-a="maison-ok">Valider</button>
      <button data-a="maison-cancel">Annuler</button>
    </div>
    <p class="muted small">Valider range l’élément dans les documents de travail ; rien n’est envoyé à la station avant « Vérifier et envoyer ».</p>
  </section>`;
}

function maisonVoieForm(e) {
  const prestige = e.doc === 'prestige';
  const caps = e.caps.map((c, i) => `<fieldset class="mcap"><legend>Rang ${(prestige ? 4 : 1) + i}</legend>
      <div class="mgrid">
        ${mInput('Capacité', `caps.${i}.name`, c.name)}
        ${mSelect('Action', `caps.${i}.action`, c.action, MAISON_ACTIONS)}
        <label class="chk"><input type="checkbox" data-m="caps.${i}.spell"${c.spell ? ' checked' : ''}> Sort (compte pour les PM)</label>
      </div>
      ${mArea('Texte', `caps.${i}.text`, c.text, 'Description de la capacité (Markdown : **gras**, *italique*, listes)', 3)}
      ${mInput('Bonus permanents', `caps.${i}.bonus`, c.bonus, 'ex. DEF +1 · Init +CHA · armes arc : DM +PER')}
    </fieldset>`).join('');
  return `<div class="mgrid">
      ${mSelect('Type', 'doc', e.doc, [['voies', 'Voie de profil ou de peuple (rangs 1 à 5)'], ['prestige', 'Voie de prestige (rangs 4 à 8)']])}
      ${mSelect('Famille', 'famille', e.famille, maisonFamilles('voie', e.doc))}
    </div>
    ${mArea('Introduction', 'intro', e.intro, 'Texte facultatif avant les capacités', 2)}
    ${caps}
    <p class="muted small">Bonus : éléments séparés par « · » — DEF, Init, PV, PM, PC, DR (+1 ou +CHA…), caractéristique (AGI +1),
      PM = CHA + sorts, armes catégorie : attaque +1, DM +FOR, critique +1, portée ×2. Le reste se note dans le texte.</p>
    ${e.variantes && e.variantes.list.length ? `<p class="muted small">${e.variantes.list.length} variante(s) écrite(s) dans le document : conservée(s) telles quelles.</p>` : ''}`;
}

/* Liste de voies d'un profil ou d'un peuple : pastilles retirables, et menu pour en ajouter. */
function maisonVoiesPicker(e, model, peuple) {
  const ids = Object.keys(model.voies).filter(id => !model.voies[id].prestige && !e.voies.includes(id));
  const groups = {};
  for (const id of ids) (groups[model.voies[id].famille] = groups[model.voies[id].famille] || []).push(id);
  const order = Object.keys(groups).sort((a, b) => (a === 'peuple') - (b === 'peuple') || maisonFam(a).localeCompare(maisonFam(b)));
  if (peuple) order.reverse();
  const opts = order.map(f => `<optgroup label="${esc(maisonFam(f))}">${groups[f]
    .sort((a, b) => model.voies[a].name.localeCompare(model.voies[b].name))
    .map(id => `<option value="${esc(id)}">${esc(model.voies[id].name)}</option>`).join('')}</optgroup>`).join('');
  return `<div class="mfield"><span>Voies</span>
    <div class="chips">${e.voies.map(id => `<button class="chip sm on" data-a="maison-unvoie" data-v="${esc(id)}" title="Retirer">${esc(model.voies[id] ? model.voies[id].name : id)} ✕</button>`).join('') || '<small class="muted">Aucune</small>'}</div>
    <select data-m-add="voies"><option value="">+ Ajouter une voie…</option>${opts}</select></div>`;
}

function maisonProfilForm(e, model) {
  const f = model.familles[e.famille] || {};
  return `${mSelect('Famille', 'famille', e.famille, maisonFamilles('profil'))}
    ${mArea('Description', 'desc', e.desc, 'Une phrase, affichée en italique', 2)}
    <p class="small">PV niveau 1 <b>${esc(f.pv1 || '—')}</b> · PV par niveau <b>${esc(f.pvniv ? f.pvniv + ' + CON' : '—')}</b> ·
      dé de récupération <b>${esc(f.dr || '—')}</b> · DR au niveau 1 <b>${esc(f.drn || '—')}</b> · points de chance <b>${esc(f.pc || '—')}</b>
      <span class="muted">: valeurs de la famille ${esc(maisonFam(e.famille))} (familles.md).</span></p>
    <div class="mgrid">
      ${mInput('Caractéristiques clés', 'car', e.car, 'FOR, CON, AGI')}
      ${mInput('Caractéristique de magie', 'magie', e.magie, '— ou INT, VOL…')}
    </div>
    ${mArea('Particularités', 'bonus', e.bonus, 'Une par ligne, affichées sur la fiche', 2)}
    ${mArea('Armes & armures', 'armes', e.armes, 'Armes maniées, armure permise', 2)}
    ${mArea('Équipement de départ', 'equipement', e.equipement, '', 2)}
    ${mArea('Encadré', 'extra', e.extra, 'Texte facultatif (conseil, variante…)', 2)}
    ${maisonVoiesPicker(e, model, false)}`;
}

function maisonPeupleForm(e, model) {
  return `${mArea('Description', 'desc', e.desc, 'Présentation du peuple', 3)}
    ${mArea('Caractéristiques', 'car', e.car, '+1 FOR, −1 CHA', 2)}
    ${mArea('Autres sections', 'autres', e.autres, '### Repères\n\n**Âge de départ :** …\n\n### Noms typiques\n\n…', 5)}
    ${maisonVoiesPicker(e, model, true)}`;
}
