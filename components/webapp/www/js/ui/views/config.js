/* Vue : réglages propres à cet appareil. */

/* ---------- Réglages propres à cet appareil (rien n'est stocké sur la station) ---------- */
function viewConfig() {
  const [icon, label, space] = ROLES[S.role] || ROLES.joueur;
  return `<div class="sheet-head"><a class="back" href="#/">‹</a><h1>Réglages de cet appareil</h1></div>
  <section class="card">
    <h2>Utilisateur de cet appareil</h2>
    <p>${icon} <b>${label}</b>${S.role !== 'ecran' && S.player ? ` · ${esc(S.player)}` : ''}
      <small class="muted">· à la connexion : ${space}</small></p>
    ${S.role !== 'ecran' ? `<form class="row" data-form="player">
        <input name="player" value="${esc(S.player)}" placeholder="Votre nom" maxlength="30" required>
        <button class="btn">Renommer</button>
      </form>` : ''}
    <div class="row roles">
      ${Object.entries(ROLES).map(([r, [i, l]]) => `<button class="sm${r === S.role ? ' on' : ''}" data-a="role" data-v="${r}"${r === S.role ? ' disabled' : ''}>${i} ${l}</button>`).join('')}
    </div>
    <div class="row"><button class="danger" data-a="resetrole">Changer d’utilisateur</button></div>
  </section>
  <section class="card">
    <h2>Écran partagé</h2>
    <p class="muted small">Affiche l’espace global en plein écran pour toute la table, avec le lieu choisi par le MJ en fond.
      Les images de lieux se chargent dans l’espace global, sur cet appareil.</p>
    <div class="row"><button class="btn" data-a="screenon">📺 ${S.screen ? 'Reprendre le' : 'Passer en'} mode écran</button></div>
  </section>`;
}
