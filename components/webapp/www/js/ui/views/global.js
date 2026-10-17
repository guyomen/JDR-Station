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
    return { names, who: p.mj ? 'Meneur de jeu' : names.length ? names.join(', ') : 'Spectateur' };
  };
  const peer = p => {
    const { names, who } = peerWho(p);
    const players = [...new Set(p.chars.filter(live).map(id => byId(id).player).filter(Boolean))];
    const sub = [p.mj && names.length ? names.join(', ') : players.join(', '), p.dev, `depuis ${mins(p.since)} min`].filter(Boolean).join(' · ');
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
    ? `<button class="bgmiss" data-a="fixbg">⚠ Lieu « ${esc(bg)} » absent de cet écran : voir les réglages</button>` : '';
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
      ${scr ? awayHTML + peers : peers + awayHTML}
    </div>
  </div>`;
}
