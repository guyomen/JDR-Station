/* Vue : espace joueur. */

/* ---------- Espace joueur : ses personnages, création, reprise ---------- */
function viewPlayer() {
  const item = c => {
    const k = calc(c);
    const sub = [COF2.profils[c.profil] && COF2.profils[c.profil].n, COF2.peuples[c.peuple] && COF2.peuples[c.peuple].n].filter(Boolean).join(' · ') || '—';
    return `<a class="item" href="#/c/${c.id}">
      <b>${esc(c.name || 'Sans nom')}</b>
      <small>${esc(sub)} · niv. ${esc(c.niveau)}</small>
      <span class="badge">${curOf(c, 'pv', k)}/${k.max.pv} PV</span></a>`;
  };
  const mine = S.chars.filter(c => S.mine[c.id]);
  const others = S.chars.filter(c => !S.mine[c.id]);
  return `
  <div class="sheet-head"><a class="back" href="#/">‹</a><h1>Espace joueur</h1></div>
  <section class="card">
    <p>🧝 <b>${esc(S.player || 'Sans nom')}</b> <a class="small" href="#/config">· changer</a></p>
    <h2>Mes personnages</h2>
    ${mine.length ? `<div class="list">${mine.map(item).join('')}</div>` : '<p class="muted">Aucun personnage sur cet appareil pour l’instant.</p>'}
    <h3>Nouveau personnage</h3>
    <form class="col" data-form="create">
      <div class="grid2">
        <input class="full" name="name" placeholder="Nom du personnage" maxlength="40" required>
        ${selectHTML('', '', peupleOpts(), ' name="peuple"')}
        ${selectHTML('', '', profilOpts(), ' name="profil"')}
      </div>
      <button class="btn">Créer</button>
    </form>
  </section>
  ${others.length ? `<section class="card"><h2>Autres personnages</h2><div class="list">${others.map(item).join('')}</div>
    <p class="muted small">Changement de téléphone ? Ouvrez votre personnage et saisissez son code de reprise.</p></section>` : ''}`;
}
