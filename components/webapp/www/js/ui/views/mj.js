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
      <div class="chips">${COF2.etats.map(([e, d]) => `<button class="chip sm ${c.etats.includes(e) ? 'on' : ''}" data-a="etat" data-v="${esc(e)}" title="${esc(d)}">${esc(e)}</button>`).join('')}</div>
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
  const hit = attr => [1, 5].map(d => `<button class="sm" data-a="pv-hit" ${attr} data-d="${d}" title="Retirer ${d} PV">−${d}</button>`).join('');
  const etats = p => COF2.etats.map(([e, d]) => `<button class="chip sm ${p.etats.includes(e) ? 'on' : ''}" data-a="npc-etat" data-n="${p.id}" data-v="${esc(e)}" title="${esc(d)}">${esc(e)}</button>`).join('');
  return `<div class="row"><b class="grow">Tour ${C.turn.round}</b>
      <button data-a="turn-next" class="btn">Suivant ▶</button><button data-a="turn-reset" title="Recommencer au tour 1">↺</button></div>
    <ul class="init">${rows.map(r => {
      const on = r.key === cur ? ' cur' : '';
      if (r.pj) {
        const k = calc(r.c);
        return `<li class="pj${on}" data-id="${r.c.id}"><span class="ini">${r.init}</span><span class="who">${esc(r.c.name || 'Sans nom')}</span><span class="small muted">${curOf(r.c, 'pv', k)}/${k.max.pv} PV</span><span class="acts">${hit('')}</span></li>`;
      }
      const p = r.p;
      return `<li class="npc${on}${p.show ? '' : ' masked'}" data-hp="${hpLevel(p.pv, p.pvmax)}">
          <input type="number" inputmode="numeric" class="ini" data-npc="${p.id}.init" value="${esc(p.init)}">
          <span class="who">${KIND[p.kind]}<input data-npc="${p.id}.name" value="${esc(p.name)}" maxlength="30"></span>
          <span class="pvs"><input type="number" inputmode="numeric" min="0" data-npc="${p.id}.pv" value="${esc(p.pv)}" title="PV">/<input type="number" inputmode="numeric" min="0" data-npc="${p.id}.pvmax" value="${esc(p.pvmax)}" title="PV max"></span>
          <span class="acts">${hit(`data-n="${p.id}"`)}<button class="sm eye ${p.show ? 'on' : ''}" data-a="npc-show" data-n="${p.id}" title="${p.show ? 'Visible' : 'Masqué'} dans l’espace global">${p.show ? '👁' : '🚫'}</button><button class="x" data-a="npc-del" data-n="${p.id}" title="Supprimer">✕</button></span>
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
      (vert à 100 % des PV, rouge à 1 PV restant, sinon jaune à 2/3 des PV ou moins et rouge à 1/3 ou moins, noir = mort à 0 PV), jamais les PV. Un mort reste dans l’initiative.</p>`;
}

function mjTools() {
  if (!RULES.custom) refreshRulesIndex();
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
    <section class="card"><h3>Repos</h3>
      <div class="row"><button data-a="rest-full">Récupération complète du groupe</button></div>
      <p class="muted small">8 h : +1 DR (sans dépasser le maximum) et tous les PM. Les PV se regagnent en dépensant des DR (récupération rapide : 1 DR + ½ niveau PV).</p>
    </section>
    <section class="card"><h3>Règles de la table</h3>
      <p class="muted small">Les documents de l’Espace Règles sont aussi les données de la fiche : voies, bonus des capacités,
        profils, peuples, armes, armures, états. Téléchargez-les, modifiez-les (texte, nouvelles voies, bonus…), puis envoyez
        les fichiers modifiés : ils sont vérifiés, puis toute la table passe aux nouvelles règles.</p>
      <div data-rules-admin>${rulesAdminHTML()}</div>
    </section>
    <section class="card"><h3>Sauvegarde</h3>
      <div class="row"><button data-a="export">⬇ Exporter (JSON)</button>
        <label class="btn ghost">⬆ Importer<input type="file" accept=".json,application/json" data-import hidden></label></div>
      <p class="muted small">L’import remplace tous les personnages de la station.</p>
    </section>
    <section class="card"><h3>Station</h3>
      <div data-sys>${sysHTML()}</div>
    </section>
    <section class="card"><h3>Divers</h3>
      <div class="row"><button data-a="clearlog">Vider le journal des dés</button><button data-a="mjlogout" class="danger">Quitter le mode MJ</button></div>
    </section>`;
}

/* ---------- État de la station (onglet Outils) ---------- */
function pollSys() {
  const r = route();
  if (S.isMJ && r[0] === 'mj' && !r[1] && S.mjtab === 'outils' && !document.hidden) send({ t: 'sys', pin: S.pin });
}

function sysHTML() {
  const y = S.sys;
  if (!y) return '<p class="muted">Interrogation de la station…</p>';
  const ko = b => `${Math.round(n(b) / 1024)} Ko`;
  const bar = (used, total, warn) => {
    const p = total ? Math.round(used * 100 / total) : 0;
    return `<span class="sysbar${p >= warn ? ' warn' : ''}"><i style="width:${p}%"></i></span> ${p} %`;
  };
  const up = n(y.up);
  const d = Math.floor(up / 86400), h = Math.floor(up / 3600) % 24, m = Math.floor(up / 60) % 60;
  const dur = d ? `${d} j ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
  const fs = y.fs, heap = y.heap || {};
  const rssi = (y.wifi && y.wifi.rssi) || [];
  const rows = [
    ['Température', y.temp != null ? `<span class="${y.temp >= 70 ? 'syswarn' : ''}">${n(y.temp).toFixed(1)} °C</span> <small class="muted">(puce)</small>` : '—'],
    ['Stockage', fs ? `${bar(fs.used, fs.total, 85)} · ${ko(fs.total - fs.used)} libres sur ${ko(fs.total)}` : '—'],
    ['Mémoire vive', `${bar(heap.total - heap.free, heap.total, 85)} · ${ko(heap.free)} libres
      <small class="muted">(minimum atteint : ${ko(heap.min)}, plus grand bloc : ${ko(heap.big)})</small>`],
    ['Wi-Fi', `canal ${esc(y.wifi && y.wifi.ch)} · ${rssi.length} appareil(s)${rssi.length ? ` · signal ${Math.max(...rssi)} à ${Math.min(...rssi)} dBm` : ''}
      · ${n(y.peers)} connecté(s) à l’appli`],
    ['En marche depuis', `${dur} <small class="muted">(démarrage : ${esc(y.reset)})</small>`],
    ['Puce', `${esc(y.chip)} · ${esc(y.cpu)} MHz · flash ${Math.round(n(y.flash) / 1048576)} Mo · ${esc(y.tasks)} tâches`],
    ['Logiciel', `${esc(y.app)} · ESP-IDF ${esc(y.idf)} · compilé le ${esc(y.built)}`],
  ];
  return `<dl class="sys">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <p class="muted small">Actualisé toutes les 5 s. Le stockage contient la partie et les images des personnages ;
      la mémoire vive « minimum atteint » est le plus bas niveau depuis le démarrage.</p>`;
}
