/* Vue : espace MJ (groupe, initiative, dés, outils). */

/* ---------- MJ ---------- */
function viewLogin() {
  return `<section class="card narrow">
    <h2>Espace MJ</h2>
    <form class="col" data-form="login">
      <input name="pin" type="password" inputmode="numeric" placeholder="Code MJ" autocomplete="current-password" required>
      <button class="btn">Entrer</button>
    </form>
    <p><a href="#/">‹ Retour</a></p>
  </section>`;
}

function viewMJ() {
  const tabs = [['groupe', 'Groupe'], ['init', 'Initiative'], ['journal', 'Dés'], ['outils', 'Outils']];
  const views = { groupe: mjGroup, init: mjInit, journal: () => diceUI(true), outils: mjTools };
  return `<div class="mj">
    <nav class="tabs">${tabs.map(([key, l]) => `<button data-a="mjtab" data-v="${key}" class="${key === S.mjtab ? 'on' : ''}">${l}</button>`).join('')}</nav>
    ${views[S.mjtab]()}
  </div>`;
}

function mjGroup() {
  if (!S.chars.length) return '<p class="muted center">Aucun personnage. Les joueurs créent leur fiche depuis l’accueil.</p>';
  return `<div class="cards">${S.chars.map(c => {
    const k = calc(c);
    const prof = COF2.profils[c.profil];
    const gear = [
      c.armure && `🛡 ${esc(ARMURES[c.armure].nom)}`,
      c.bouclier && `🛡 ${esc(BOUCLIERS[c.bouclier].nom)}`,
      ...c.armes.map(w => { const st = weaponStats(c, w, k); return `⚔ ${esc(st.W.nom)} ${sgn(st.att)} · ${esc(st.dm)}`; }),
    ].filter(Boolean);
    const voies = c.voies.map(v => `${esc(voieNom(v).replace(/^Voie (de la |du |des |de l’|de l'|d’)?/, ''))} ${n(v.rang)}`).join(', ');
    return `<article class="card mjcard" data-id="${c.id}">
      <header>
        ${avatarHTML(c)}
        <div class="grow"><b data-calc="name"></b><small>${esc(prof ? prof.n : 'Profil ?')} niv. ${esc(c.niveau)} · ${esc(c.player || '—')}</small></div>
        <a class="btn sm ghost" href="#/mj/c/${c.id}">Fiche ›</a>
      </header>
      ${RES.map(([key, s, l]) => resRow(c, key, s, l, true, k)).join('')}
      <div class="statline">${DERIVED.map(([key, s]) => `<span>${s} <b data-calc="${key}"></b></span>`).join('')}</div>
      <div class="chips">${COF2.etats.map(([e, d]) => `<button class="chip sm ${c.etats.includes(e) ? 'on' : ''}" data-a="etat" data-v="${e}" title="${esc(d)}">${e}</button>`).join('')}</div>
      <div class="gear small">${gear.join(' · ') || 'Aucun équipement'}</div>
      ${voies ? `<div class="gear small">✦ ${voies}</div>` : ''}
      <small class="muted">${esc(c.bourse.po)} po · ${esc(c.inventaire.length)} objet(s) · code <span class="code small">${esc(S.tokens[c.id] || '?')}</span></small>
    </article>`;
  }).join('')}</div>`;
}

function mjInit() {
  const C = S.combat;
  const rows = initOrder(C.npcs);
  const cur = curKey(rows, C.turn.cur);
  const etats = p => COF2.etats.map(([e, d]) => `<button class="chip sm ${p.etats.includes(e) ? 'on' : ''}" data-a="npc-etat" data-n="${p.id}" data-v="${e}" title="${esc(d)}">${e}</button>`).join('');
  return `<div class="row"><b class="grow">Tour ${C.turn.round}</b>
      <button data-a="turn-next" class="btn">Suivant ▶</button><button data-a="turn-reset" title="Recommencer au tour 1">↺</button></div>
    <ul class="init">${rows.map(r => {
      const on = r.key === cur ? ' cur' : '';
      if (r.pj) {
        const k = calc(r.c);
        return `<li class="pj${on}"><span class="ini">${r.init}</span><span class="who">${esc(r.c.name || 'Sans nom')}</span><span class="small muted">${curOf(r.c, 'pv', k)}/${k.max.pv} PV</span><span></span></li>`;
      }
      const p = r.p;
      return `<li class="npc${on}${p.show ? '' : ' masked'}" data-hp="${hpLevel(p.pv, p.pvmax)}">
          <input type="number" inputmode="numeric" class="ini" data-npc="${p.id}.init" value="${esc(p.init)}">
          <span class="who">${KIND[p.kind]}<input data-npc="${p.id}.name" value="${esc(p.name)}" maxlength="30"></span>
          <span class="pvs"><input type="number" inputmode="numeric" data-npc="${p.id}.pv" value="${esc(p.pv)}" title="PV">/<input type="number" inputmode="numeric" data-npc="${p.id}.pvmax" value="${esc(p.pvmax)}" title="PV max"></span>
          <span class="acts"><button class="sm eye ${p.show ? 'on' : ''}" data-a="npc-show" data-n="${p.id}" title="${p.show ? 'Visible' : 'Masqué'} dans l’espace global">${p.show ? '👁' : '🚫'}</button><button class="x" data-a="npc-del" data-n="${p.id}" title="Supprimer">✕</button></span>
          <details class="npcx" data-k="npc-${p.id}"><summary>États${p.etats.length ? ' : ' + esc(p.etats.join(', ')) : ''}</summary><div class="chips">${etats(p)}</div></details>
        </li>`;
    }).join('')}
    </ul>
    <form class="npcform" data-form="npc">
      <select name="kind"><option value="monstre">👹 Monstre</option><option value="pnj">👤 PNJ</option></select>
      <input name="name" placeholder="Nom (ex : Gobelin)" maxlength="30" required>
      <input name="init" type="number" inputmode="numeric" placeholder="Init" required>
      <input name="pv" type="number" inputmode="numeric" placeholder="PV" min="0">
      <input name="qty" type="number" inputmode="numeric" placeholder="× 1" min="1" max="10" title="Nombre (numérotés)">
      <label class="chk"><input type="checkbox" name="show"> Visible</label>
      <button class="btn">Ajouter</button>
    </form>
    ${C.npcs.length ? `<div class="row"><button class="sm" data-a="npc-allshow" data-v="1">👁 Tout montrer</button><button class="sm" data-a="npc-allshow" data-v="0">🚫 Tout masquer</button><button class="sm danger" data-a="npc-clear">Retirer tous les PNJ</button></div>` : ''}
    <p class="muted small">Init des créatures = 10 + PER (+ bonus). Égalité : les PJ d’abord. 👁 = visible dans l’espace global : initiative, états et santé en couleur
      (vert, jaune sous 2/3 des PV, rouge sous 1/3, noir = mort sous 0 PV), jamais les PV. Un mort reste dans l’initiative.</p>`;
}

function mjTools() {
  const bg = S.combat.bg;
  const gone = bg && !S.lieux.some(l => l.id === bg);
  return `<section class="card"><h3>Lieu affiché sur l’écran partagé</h3>
      ${S.lieux.length ? `<div class="chips">
          <button class="chip sm ${bg ? '' : 'on'}" data-a="bg-clear">Aucun</button>
          ${S.lieux.map(l => `<button class="chip sm ${l.id === bg ? 'on' : ''}" data-a="bg-set" data-v="${esc(l.id)}">${esc(l.n)}</button>`).join('')}
        </div>`
        : '<p class="muted">Aucun lieu disponible.</p>'}
      ${gone ? `<p class="small">⚠ Le lieu affiché (« ${esc(bg)} ») n’est plus dans la liste. <button class="sm" data-a="bg-clear">Ne plus l’afficher</button></p>` : ''}
      <p class="muted small">Les lieux se chargent dans l’espace global, sur l’appareil de l’écran partagé (🖼 Lieux → dossier d’images) :
        la liste est gardée par la station, même quand l’écran est déconnecté.</p>
    </section>
    <section class="card"><h3>Expérience</h3>
      <form class="row" data-form="xp"><input name="xp" type="number" inputmode="numeric" placeholder="XP" required><button class="btn">Donner à tout le groupe</button></form>
    </section>
    <section class="card"><h3>Repos</h3>
      <div class="row"><button data-a="rest-full">Récupération complète du groupe</button></div>
      <p class="muted small">8 h : +1 DR (sans dépasser le maximum) et tous les PM. Les PV se regagnent en dépensant des DR (récupération rapide : 1 DR + ½ niveau PV).</p>
    </section>
    <section class="card"><h3>Sauvegarde</h3>
      <div class="row"><button data-a="export">⬇ Exporter (JSON)</button>
        <label class="btn ghost">⬆ Importer<input type="file" accept=".json,application/json" data-import hidden></label></div>
      <p class="muted small">L’import remplace tous les personnages de la station.</p>
    </section>
    <section class="card"><h3>Divers</h3>
      <div class="row"><button data-a="clearlog">Vider le journal des dés</button><button data-a="mjlogout" class="danger">Quitter le mode MJ</button></div>
    </section>`;
}
