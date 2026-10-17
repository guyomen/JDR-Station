/* Vue : réglages propres à cet appareil. */

/* ---------- Réglages propres à cet appareil (rien n'est stocké sur la station) ---------- */
function viewConfig() {
  const bg = curBg();
  const d = S.imgDir;
  const when = d && new Date(d.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
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
    <h2>Images de lieux <span class="badge">${S.imgs.length}</span></h2>
    <p class="muted small">Pour l’écran partagé : le MJ choisit un lieu par son ID, cet appareil affiche l’image correspondante en fond.
      L’ID est le nom du fichier sans extension (« Ville.jpg » → <span class="code small">ville</span>).
      Les images sont copiées dans le navigateur de cet appareil, jamais sur la station : après avoir modifié le dossier, resynchronisez-le.</p>
    ${d ? `<p>📁 <b>${esc(d.name)}</b> <small class="muted">· ${d.n} image${d.n > 1 ? 's' : ''} · synchronisé le ${esc(when)}</small></p>` : ''}
    <div class="row">
      <button class="btn" data-a="imgdir">📁 ${d ? 'Resynchroniser le dossier' : 'Choisir le dossier d’images'}</button>
      <button data-a="imgadd">＋ Ajouter des fichiers</button>
      ${S.imgs.length ? '<button class="danger" data-a="imgclear">Tout effacer</button>' : ''}
    </div>
    ${bg && !S.imgs.includes(bg) ? `<p class="small">⚠ Le MJ a choisi « ${esc(bg)} », absent de cet appareil.</p>` : ''}
    ${S.imgs.length ? `<div class="thumbs">${S.imgs.map(id => `<figure class="thumb${id === bg ? ' on' : ''}">
        ${S.thumbs[id] ? `<img src="${S.thumbs[id]}" alt="">` : '<span class="noimg">?</span>'}
        <figcaption><span class="code small">${esc(id)}</span><button class="x" data-a="imgdel" data-v="${esc(id)}" title="Supprimer">✕</button></figcaption>
      </figure>`).join('')}</div>`
      : `<p class="muted">${S.imgErr ? '⚠ Stockage local indisponible dans ce navigateur (navigation privée ?).' : 'Aucune image sur cet appareil.'}</p>`}
  </section>
  <section class="card">
    <h2>Écran partagé</h2>
    <p class="muted small">Affiche l’espace global en plein écran pour toute la table, avec le lieu choisi par le MJ en fond.</p>
    <div class="row"><button class="btn" data-a="screenon">📺 ${S.screen ? 'Reprendre le' : 'Passer en'} mode écran</button></div>
  </section>`;
}
