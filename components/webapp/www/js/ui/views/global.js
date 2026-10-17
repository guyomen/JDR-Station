/* Vue : espace global (et mode écran partagé). */

/* ---------- Espace global : qui est connecté, état du groupe ---------- */
function viewGlobal() {
  const scr = S.screen; // écran partagé : lecture à distance, pas de navigation
  const mins = ts => Math.max(0, Math.round((Date.now() - S.clock - ts) / 60000));
  const live = id => !!byId(id);
  const sheet = c => (S.isMJ ? '#/mj/c/' : '#/c/') + c.id;
  const online = new Set(S.peers.filter(p => !p.mj).flatMap(p => p.chars.filter(live)));
  const peerWho = p => {
    const names = p.chars.filter(live).map(id => byId(id).name || 'Sans nom');
    return { names, who: p.mj ? 'Meneur de jeu' : names.length ? names.join(', ') : p.screen ? 'Écran partagé' : p.player || 'Spectateur' };
  };
  const peer = p => {
    const { names, who } = peerWho(p);
    const players = p.player ? [p.player] : [...new Set(p.chars.filter(live).map(id => byId(id).player).filter(Boolean))];
    const sub = [p.mj && names.length ? [p.player, ...names].filter(Boolean).join(', ') : players.join(', '), p.dev, `depuis ${mins(p.since)} min`].filter(Boolean).join(' · ');
    return `<div class="item peer">
      <span class="dot"></span>
      <b>${p.mj ? '🎲 ' : ''}${esc(who)}${p.id === S.me ? ' <small>(vous)</small>' : ''}</b>
      <small>${esc(sub)}</small></div>`;
  };
  const card = c => {
    const k = calc(c);
    const prof = COF2.profils[c.profil];
    return `<article class="card mjcard gcard${'c:' + c.id === turn ? ' cur' : ''}" data-id="${c.id}">
      <header>
        <div class="grow"><b data-calc="name"></b><small>${esc(prof ? prof.n : 'Profil ?')} niv. ${esc(c.niveau)} · ${esc(c.player || '—')}</small></div>
        <span class="pill">DEF <b data-calc="def"></b></span>
        ${scr ? '' : `<a class="btn sm ghost" href="${sheet(c)}">Fiche ›</a>`}
      </header>
      ${RES.filter(([key]) => key === 'pv' || key === 'pm').map(([key, s, l]) => resRow(c, key, s, l, false, k)).join('')}
      ${c.etats.length ? `<div class="chips">${c.etats.map(e => `<span class="chip sm on">${esc(e)}</span>`).join('')}</div>` : ''}
    </article>`;
  };
  const rows = initOrder(S.pub.npcs);
  const turn = S.pub.turn.cur; // vide quand un PNJ masqué agit
  const curRow = rows.find(r => r.key === turn);
  const tags = list => (list.length ? `<small class="etats">${list.map(esc).join(' · ')}</small>` : '');
  const initRow = r => {
    const on = r.key === turn ? ' cur' : '';
    if (r.pj) {
      const k = calc(r.c);
      return `<li class="pj${on}"><span class="ini">${r.init}</span><span class="who">${esc(r.c.name || 'Sans nom')}${tags(r.c.etats)}</span>
        <span class="small muted">${curOf(r.c, 'pv', k)}/${k.max.pv} PV</span></li>`;
    }
    const p = r.p;
    return `<li class="npc${on}" data-hp="${p.hp}"><span class="ini">${r.init}</span><span class="who">${KIND[p.kind]} ${esc(p.name)}${tags(p.etats)}</span>
      <span class="hp" title="${HP[p.hp] || 'Santé inconnue'}"></span></li>`;
  };
  const active = S.chars.filter(c => online.has(c.id));
  const away = S.chars.filter(c => !online.has(c.id));
  const awayPV = c => { const k = calc(c); return `${curOf(c, 'pv', k)}/${k.max.pv} PV`; };

  const bg = curBg();
  const missing = bg && !S.imgs.includes(bg)
    ? `<button class="bgmiss" data-a="fixbg">⚠ Lieu « ${esc(lieuLabel(bg))} » absent de cet écran : voir les lieux</button>` : '';
  const head = scr
    ? `<button class="scr-exit" data-a="screen" title="Quitter le mode écran">✕</button>${missing}`
    : `<div class="sheet-head"><a class="back" href="#/">‹</a><h1 class="grow">Espace global</h1>
        <button class="sm" data-a="screen" title="Pour un écran partagé visible par toute la table">📺 Mode écran</button></div>`;
  const init = rows.length ? `<section class="card ginit-card">
      <h2>Initiative <span class="badge">Tour ${S.pub.turn.round}</span></h2>
      ${curRow ? `<p class="turnbar">▶ Au tour de <b>${esc(curRow.pj ? curRow.c.name || 'Sans nom' : curRow.p.name)}</b></p>` : ''}
      <ul class="init ginit">${rows.map(initRow).join('')}</ul>
    </section>` : '';
  const peers = scr
    ? `<p class="gfoot"><b>Connectés</b> ${S.peers.map(p => `<span class="tag"><span class="dot"></span>${p.mj ? '🎲 ' : ''}${esc(peerWho(p).who)}</span>`).join('') || '—'}</p>`
    : `<section class="card">
        <h2>Connectés <span class="badge">${S.peers.length}</span></h2>
        ${S.peers.length ? `<div class="list">${S.peers.map(peer).join('')}</div>` : '<p class="muted">Personne n’est connecté.</p>'}
      </section>`;
  const awayHTML = !away.length ? '' : scr
    ? `<p class="gfoot"><b>Hors ligne</b> ${away.map(c => `<span class="tag">${esc(c.name || 'Sans nom')} · ${awayPV(c)}</span>`).join('')}</p>`
    : `<section class="card away"><h3>Hors ligne</h3><div class="list">${away.map(c => `<a class="item" href="${sheet(c)}"><b>${esc(c.name || 'Sans nom')}</b><small>${esc(c.player || '—')}</small>
        <span class="badge">${awayPV(c)}</span></a>`).join('')}</div></section>`;
  return `${head}
  <div class="glayout${init ? '' : ' noinit'}">
    ${init ? `<div class="gside">${init}</div>` : ''}
    <div class="gmain">
      <h2>Personnages actifs</h2>
      ${active.length ? `<div class="cards">${active.map(card).join('')}</div>` : '<p class="muted">Aucun joueur connecté avec son personnage.</p>'}
      ${scr ? awayHTML + peers : peers + awayHTML + lieuxCard()}
    </div>
  </div>`;
}

/* ---------- Lieux : images chargées sur l'écran partagé, liste annoncée à la station, choix du MJ ---------- */
const lieuLabel = id => (S.lieux.find(l => l.id === id) || {}).n || S.imgNames[id] || id;
function lieuxCard() {
  const bg = curBg();
  const d = S.imgDir;
  const when = d && new Date(d.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const others = S.lieux.filter(l => !S.imgs.includes(l.id));
  const body = `<p class="muted small">Sur l’appareil qui sert d’écran partagé, chargez les images de lieux : leur liste est envoyée à la station
      et le MJ y choisit le lieu affiché en fond. Le nom du fichier donne le nom du lieu (« Ville du port.jpg » → Ville du port).
      Les images restent dans le navigateur de cet appareil, jamais sur la station : après avoir modifié le dossier, resynchronisez-le.</p>
    ${d ? `<p>📁 <b>${esc(d.name)}</b> <small class="muted">· ${d.n} image${d.n > 1 ? 's' : ''} · synchronisé le ${esc(when)}</small></p>` : ''}
    <div class="row">
      <button class="btn" data-a="imgdir">📁 ${d ? 'Resynchroniser le dossier' : 'Choisir le dossier d’images'}</button>
      <button data-a="imgadd">＋ Ajouter des fichiers</button>
      ${S.imgs.length ? '<button class="danger" data-a="imgclear">Tout effacer</button>' : ''}
    </div>
    ${S.imgs.length && !lieuxSynced() ? `<p class="small">⚠ ${S.lieux.length ? 'La station propose d’autres lieux que les images de cet appareil' : 'La station ne connaît pas encore ces lieux'}.
        <button class="sm" data-a="lieux-send">📡 Annoncer ces ${S.imgs.length} lieux</button></p>` : ''}
    ${S.imgs.length && bg && !S.imgs.includes(bg) ? `<p class="small">⚠ Le MJ a choisi « ${esc(lieuLabel(bg))} », absent de cet appareil.</p>` : ''}
    ${S.imgs.length ? `<div class="thumbs">${S.imgs.map(id => `<figure class="thumb${id === bg ? ' on' : ''}">
        ${S.thumbs[id] ? `<img src="${S.thumbs[id]}" alt="">` : '<span class="noimg">?</span>'}
        <figcaption><span class="small" title="${esc(id)}">${esc(S.imgNames[id] || id)}</span><button class="x" data-a="imgdel" data-v="${esc(id)}" title="Supprimer">✕</button></figcaption>
      </figure>`).join('')}</div>`
      : `<p class="muted">${S.imgErr ? '⚠ Stockage local indisponible dans ce navigateur (navigation privée ?).' : 'Aucune image sur cet appareil.'}</p>`}
    ${others.length ? `<p class="small muted">Annoncés à la station depuis un autre appareil : ${others.map(l => esc(l.n)).join(', ')}</p>` : ''}`;
  return `<section class="card" id="lieux">
    <h2>🖼 Lieux <span class="badge">${S.lieux.length}</span></h2>
    ${S.role === 'ecran' ? body : `<details data-k="lieux"><summary>Charger les images (sur l’appareil de l’écran partagé)</summary>${body}</details>`}
  </section>`;
}
