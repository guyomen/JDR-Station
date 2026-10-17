/* Vue : fiche de personnage (onglets Perso, Combat, Sac, Notes, Dés). */

/* ---------- Fiche de personnage ---------- */
function viewSheet(id, mj) {
  const c = byId(id);
  const back = mj ? '#/mj' : '#/joueur';
  if (!c) return `<section class="card"><p>Personnage introuvable.</p><a class="btn ghost" href="${back}">Retour</a></section>`;
  const can = mj || !!S.mine[id];
  const dis = can ? '' : ' disabled';
  const k = calc(c);
  const prof = COF2.profils[c.profil];
  const peup = COF2.peuples[c.peuple];
  const num = (p, label, attrs = '') => `<label class="f"><span>${label}</span><input type="number" inputmode="numeric" data-p="${p}" value="${esc(get(c, p))}"${attrs}${dis}></label>`;
  const txt = (p, label, attrs = '') => `<label class="f"><span>${label}</span><input type="text" data-p="${p}" value="${esc(get(c, p))}"${attrs}${dis}></label>`;
  const sel = (p, label, opts, attrs = '') => `<label class="f"><span>${label}</span>${selectHTML(p, get(c, p), opts, attrs + dis)}</label>`;
  const area = (p, label, ph = '') => `<label class="f full"><span>${label}</span><textarea data-p="${p}" placeholder="${ph}"${dis}>${esc(get(c, p))}</textarea></label>`;
  const del = (list, i) => `<button class="x" data-a="del" data-list="${list}" data-i="${i}" title="Supprimer">✕</button>`;
  const tab = S.tab;
  const tabs = [['perso', 'Perso'], ['combat', 'Combat'], ['voies', 'Voies'], ['sac', 'Sac'], ['notes', 'Notes'], ['des', 'Dés']];
  const pane = (key, body) => `<section class="pane ${tab === key ? 'on' : ''}" data-pane="${key}">${body}</section>`;
  const token = S.mine[id] || S.tokens[id];
  const niveaux = Array.from({ length: 20 }, (_, i) => [i + 1, 'Niveau ' + (i + 1)]);

  const perso = `
    <div class="avrow">${avatarHTML(c, 'lg', true)}
      ${can ? `<div class="col">
          <div class="row"><button class="sm" data-a="avatar-pick">📷 ${S.avatars[id] ? 'Changer l’image' : 'Choisir une image'}</button>
            ${S.avatars[id] ? '<button class="sm" data-a="avatar-del">Retirer</button>' : ''}</div>
          <small class="muted">Recadrée en carré et réduite (192 px) : affichée sur l’écran partagé et chez le MJ.</small>
        </div>` : ''}
    </div>
    <div class="grid2">
      ${txt('name', 'Nom', ' maxlength="40"')}${txt('player', 'Joueur / joueuse', mj ? ' maxlength="30"' : ' readonly title="Nom défini dans l’Espace joueur"')}
      ${sel('peuple', 'Peuple', peupleOpts())}${sel('profil', 'Profil', profilOpts())}
      ${sel('niveau', 'Niveau', niveaux, ' data-num')}
    </div>
    ${prof ? `<div class="info small">
        <b>${esc(prof.n)}</b>${k.fam ? ` · ${esc(k.fam.n)}${k.fam.note ? ` (${esc(k.fam.note)})` : ''}` : ''}<br>
        Caractéristiques clés : <b>${esc(prof.car)}</b>${prof.magie ? ` · magie : <b>${esc(prof.magie)}</b>` : ''}
        <details data-k="profil"><summary>Description, armes, équipement</summary>
          <p><i>${esc(prof.desc)}</i></p>${prof.bonus.map(md).join('')}
          <b>Armes & armures.</b>${md(prof.armes)}<b>Équipement de départ.</b>${md(prof.equip)}
          ${prof.extra ? `<div class="muted">${md(prof.extra)}</div>` : ''}
        </details>
      </div>` : ''}
    ${peup ? `<div class="info small"><b>${esc(peup.n)}</b> : ${esc(peup.mod)}</div>` : ''}
    <h3>Caractéristiques</h3>
    <div class="caracs">${CARACS.map(([key, l]) => `
      <div class="carac">
        <button class="roll" data-a="roll" data-roll="d20:${key}" data-label="Test ${esc(l)}">${key} 🎲</button>
        <input type="number" inputmode="numeric" min="-4" max="8" data-p="car.${key}" value="${esc(c.car[key])}"${dis}>
        <small>${l} <b class="eff" data-calc="car.${key}"></b></small>
      </div>`).join('')}
    </div>
    <p class="muted small">Valeurs de base (série + peuple). Création : ${esc(COF2.series.map(([s, v]) => `${s} ${v}`).join(' · '))}. Les bonus des capacités (→) s’ajoutent automatiquement.</p>
    <div class="grid2">
      ${sel('ideal', 'Idéal héroïque', [['', '—'], ...COF2.ideaux.map(x => [x, x])])}
      ${sel('travers', 'Travers', [['', '—'], ...COF2.travers.map(x => [x, x])])}
    </div>
    ${can ? `
      <h3>Code de reprise</h3>
      <p class="small muted">Pour ouvrir ce personnage sur un autre appareil : <span class="code">${esc(token || '…')}</span></p>
      <div class="row">
        ${!mj ? '<button class="sm" data-a="forget">Retirer de cet appareil</button>' : ''}
        <button class="sm danger" data-a="delete">Supprimer le personnage</button>
      </div>` : `
      <h3>C’est votre personnage ?</h3>
      <form class="row" data-form="claim"><input name="code" placeholder="Code de reprise" maxlength="6" autocapitalize="characters" autocomplete="off"><button class="btn">Reprendre</button></form>`}`;

  const combat = `
    <div class="card">${RES.map(([key, s, l]) => resRow(c, key, s, l, can, k)).join('')}</div>
    <div class="derived">${DERIVED.map(([key, , l]) => `
      <div class="stat"><small>${l}</small><b data-calc="${key}"></b>
        ${key !== 'def' ? `<button class="sm" data-a="roll" data-roll="d20:@${key}" data-label="${esc(l)}">🎲</button>` : ''}
      </div>`).join('')}
    </div>
    <details data-k="div"><summary>Bonus divers & calculs</summary>
      <div class="grid3">${DIVERS.map(([key, s]) => num('div.' + key, s)).join('')}</div>
      <p class="muted small">
        PV = ${k.prof.pv1} + (niveau − 1) × ${k.prof.pvniv} + niveau × CON · DR = ${k.prof.drn} + CON (d${k.drType}) ·
        PC = ${k.prof.pc} + CHA · PM = VOL + ${k.sorts} sort(s) · Init = 10 + PER ·
        DEF = 10 + AGI (max. armure) + armure + bouclier · attaques = niveau (max. 10) + FOR / AGI / VOL.
        Les bonus permanents des capacités sont inclus ; ajoutez ici les autres (objets, conditions…).
      </p>
    </details>
    <h3>Protection</h3>
    <div class="grid2">
      ${sel('armure', 'Armure', COF2.armures.map(a => [a.id, a.def ? `${a.nom} (DEF +${a.def})` : a.nom]))}
      ${sel('bouclier', 'Bouclier', COF2.boucliers.map(b => [b.id, b.def ? `${b.nom} (DEF +${b.def})` : b.nom]))}
    </div>
    ${k.agiCap < k.car.AGI ? `<p class="small warn">L’armure limite l’AGI à ${sgn(k.agiCap)} pour la DEF.</p>` : ''}
    <h3>Armes</h3>
    ${c.armes.map((w, i) => weaponRow(c, w, i, k, dis, del)).join('')}
    <button data-a="add" data-list="armes">+ Ajouter une arme</button>
    <h3>États</h3>
    <div class="chips">${COF2.etats.map(([e, d]) => `<button class="chip ${c.etats.includes(e) ? 'on' : ''}" data-a="etat" data-v="${esc(e)}" title="${esc(d)}"${dis}>${esc(e)}</button>`).join('')}</div>
    ${c.etats.length ? `<ul class="small muted">${c.etats.map(e => `<li><b>${esc(e)}</b> : ${esc(ETAT_INFO[e] || '')}</li>`).join('')}</ul>` : ''}`;

  const sac = `
    <div class="grid3">${num('bourse.po', "Pièces d'or")}${num('bourse.pa', "Pièces d'argent")}${num('bourse.pc', 'Pièces de cuivre')}</div>
    <p class="muted small">1 po = 10 pa = 100 pc. Départ : 2d6 pa + sac d’aventurier (couverture, torche, briquet, outre, gamelle).</p>
    <h3>Inventaire</h3>
    ${c.inventaire.map((it, i) => `
      <div class="entry item3">
        ${txt(`inventaire.${i}.nom`, 'Objet')}${num(`inventaire.${i}.qte`, 'Qté')}${del('inventaire', i)}
        <div class="full">${txt(`inventaire.${i}.notes`, 'Notes')}</div>
      </div>`).join('')}
    <button data-a="add" data-list="inventaire">+ Ajouter un objet</button>`;

  return `<div id="sheet" class="sheet-wrap ${can ? '' : 'ro'}" data-id="${id}">
    <div class="sheet-head">
      <a href="${back}" class="back">‹</a>
      ${avatarHTML(c)}
      <div class="grow"><h1 data-calc="name"></h1><small class="muted">${esc(prof ? prof.n : 'Profil ?')} · niv. ${esc(c.niveau)}${can ? '' : ' · lecture seule'}</small></div>
      ${keepToggle()}
    </div>
    <nav class="tabs">${tabs.map(([key, l]) => `<button data-a="tab" data-v="${key}" class="${key === tab ? 'on' : ''}">${l}</button>`).join('')}</nav>
    ${pane('perso', perso)}${pane('combat', combat)}${pane('voies', voiesPane(c, can, k))}${pane('sac', sac)}
    ${pane('notes', area('notes', 'Notes', 'Langues, contacts, quêtes, indices…'))}
    ${pane('des', diceUI(false))}
  </div>`;
}

function weaponRow(c, w, i, k, dis, del) {
  const st = weaponStats(c, w, k);
  const opts = {
    'Contact': COF2.armes.filter(a => a.att !== 'distance').map(a => [a.id, a.nom]),
    'Distance': COF2.armes.filter(a => a.att === 'distance').map(a => [a.id, a.nom + (a.portee ? ` (${a.portee} m)` : '')]),
    'Autre': [['autre', 'Autre / arme spéciale…']],
  };
  const custom = st.W.custom ? `
    <label class="f"><span>Nom</span><input data-p="armes.${i}.nom" value="${esc(w.nom)}"${dis}></label>
    <label class="f"><span>Attaque</span>${selectHTML(`armes.${i}.att`, w.att || 'contact', ATTACKS, dis)}</label>
    <label class="f"><span>DM</span><input data-p="armes.${i}.dm" value="${esc(w.dm)}" placeholder="1d8+FOR"${dis}></label>` : '';
  return `<div class="entry weapon">
    <label class="f full"><span>Arme</span>${selectHTML(`armes.${i}.id`, w.id, opts, dis)}</label>
    ${custom}
    <div class="full wstat" data-calc="arme.${i}">${wstatHTML(st)}</div>
    <div class="tools">
      <button class="sm" data-a="roll" data-roll="atk:${i}" data-label="Attaque ${esc(st.W.nom)}">🎯 Attaque</button>
      <button class="sm" data-a="roll" data-roll="dm:${i}" data-label="DM ${esc(st.W.nom)}">💥 DM</button>
      <label class="f inline"><span>Bonus magique</span>${selectHTML(`armes.${i}.bonus`, n(w.bonus), [0, 1, 2, 3, 4, 5].map(b => [b, b ? '+' + b : '—']), ' data-num' + dis)}</label>
      <label class="f inline" title="Autre bonus en attaque (arme de prédilection…)"><span>Att.</span><input type="number" data-p="armes.${i}.batt" data-num value="${n(w.batt) || ''}" placeholder="0"${dis}></label>
      <label class="f inline" title="Autre bonus aux DM : nombre et/ou caractéristique (ex. PER, 2, AGI+1)"><span>DM</span><input data-p="armes.${i}.bdm" value="${esc(w.bdm)}" placeholder="ex. PER"${dis}></label>
      <span class="grow"></span>${del('armes', i)}
    </div>
  </div>`;
}
