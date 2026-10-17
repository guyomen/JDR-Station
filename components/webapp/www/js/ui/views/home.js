/* Vue : accueil. */

/* ---------- Première connexion : qui utilise cet appareil ? ---------- */
const ROLES = {
  joueur: ['🧝', 'Joueur / joueuse', 'Espace joueur'],
  mj: ['🎲', 'Meneur de jeu', 'Espace MJ'],
  ecran: ['📺', 'Écran partagé', 'Espace global en plein écran'],
};
function viewWelcome() {
  const name = `<input name="player" value="${esc(S.player)}" placeholder="Votre nom" maxlength="30" autocomplete="nickname" required>`;
  return `<section class="card welcome">
    <h1>Bienvenue à la table</h1>
    <p class="muted">Qui utilise cet appareil ? Ce choix est retenu : à chaque connexion, l’appareil s’ouvre directement sur son espace.
      Il se modifie dans les réglages de l’appareil.</p>
    <h2>🧝 Joueur / joueuse</h2>
    <form class="col" data-form="setup" data-role="joueur">${name}<button class="btn">Entrer</button></form>
    <details data-k="setupmj"><summary>🎲 Je suis le meneur de jeu</summary>
      <form class="col" data-form="setup" data-role="mj">${name}
        <input name="pin" type="password" inputmode="numeric" placeholder="Code MJ" autocomplete="current-password" required>
        <button class="btn">Entrer</button></form>
    </details>
    <details data-k="setupscreen"><summary>📺 Appareil posé au centre de la table</summary>
      <p class="muted small">Affiche l’espace global en plein écran pour tous, avec le lieu choisi par le MJ en fond.</p>
      <button class="btn" data-a="setupscreen">En faire l’écran partagé</button>
    </details>
  </section>`;
}

/* ---------- Accueil ---------- */
function viewHome() {
  const mine = S.chars.filter(c => S.mine[c.id]).length;
  const tile = (href, icon, title, desc) => `<a class="tile card" href="${href}"><span class="ico">${icon}</span>
    <span class="grow"><b>${title}</b><small>${desc}</small></span><span class="go">›</span></a>`;
  const perso = mine ? `${mine} personnage${mine > 1 ? 's' : ''} sur cet appareil` : 'Créer ou reprendre son personnage';
  return `<div class="tiles">
    ${tile('#/joueur', '🧝', 'Espace joueur', S.player ? `${esc(S.player)} · ${perso}` : perso)}
    ${tile('#/global', '👥', 'Espace global', `${S.peers.length} connecté${S.peers.length > 1 ? 's' : ''} · état du groupe · lieux`)}
    ${tile('#/mj', '🎲', 'Espace MJ', S.isMJ ? 'Connecté en MJ' : 'Réservé au meneur de jeu')}
    ${tile('#/config', '⚙', 'Réglages de cet appareil', 'Utilisateur, écran partagé')}
  </div>`;
}
