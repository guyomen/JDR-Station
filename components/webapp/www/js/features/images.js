/* Images de lieux du mode écran : stockées dans le navigateur de l'écran (IndexedDB),
 * jamais sur la station : le MJ ne diffuse que l'ID. */

const IMG = (() => {
  let dbp;
  const db = () => dbp || (dbp = new Promise((ok, ko) => {
    const r = indexedDB.open('jdr-images', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { dbp = null; ko(r.error); };
  }));
  const tx = (mode, fn) => db().then(d => new Promise((ok, ko) => {
    const t = d.transaction('img', mode);
    const rq = fn(t.objectStore('img'));
    t.oncomplete = () => ok(rq.result);
    t.onerror = t.onabort = () => ko(t.error);
  }));
  return {
    get: id => tx('readonly', st => st.get(id)),
    put: (id, blob) => tx('readwrite', st => st.put(blob, id)),
    del: id => tx('readwrite', st => st.delete(id)),
    keys: () => tx('readonly', st => st.getAllKeys()),
    clear: () => tx('readwrite', st => st.clear()),
  };
})();

/* Liste des images de cet écran, avec une miniature pour chacune. */
function refreshImgs() {
  return IMG.keys().then(keys => Promise.all(keys.map(k => IMG.get(k))).then(blobs => {
    Object.values(S.thumbs).forEach(u => URL.revokeObjectURL(u));
    S.thumbs = {};
    keys.forEach((k, i) => { if (blobs[i]) S.thumbs[k] = URL.createObjectURL(blobs[i]); });
    S.imgs = keys.map(String).sort();
    S.imgErr = false;
    sendPresence();
    bgShown = null; // une image a pu être remplacée
    update();
  })).catch(() => { S.imgErr = true; update(); });
}
/* Sélection de fichiers ou d'un dossier entier (sous-dossiers compris). Le navigateur ne peut pas relire
 * un dossier tout seul depuis une page http : on copie son contenu, à resynchroniser après modification.
 * Champ hors de #app : un re-rendu pendant la sélection ne doit pas faire perdre l'import. */
function pickImgs(dir) {
  const inp = document.createElement('input');
  Object.assign(inp, { type: 'file', accept: 'image/*', multiple: true, hidden: true, webkitdirectory: dir });
  inp.addEventListener('change', () => { importImgs(inp.files, dir); inp.remove(); });
  document.body.append(inp);
  inp.click();
}
function importImgs(files, dir) {
  const idOf = f => imgId(f.name.replace(/\.[^.]*$/, ''));
  const list = [...files].filter(f => (f.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(f.name)) && idOf(f));
  if (!list.length) return toast('Aucune image trouvée');
  /* Un dossier remplace toute la bibliothèque : les images retirées du dossier disparaissent. */
  (dir ? IMG.clear() : Promise.resolve())
    .then(() => Promise.all(list.map(f => IMG.put(idOf(f), f))))
    .then(() => {
      if (dir) {
        S.imgDir = { name: (list[0].webkitRelativePath || '').split('/')[0] || 'Dossier', n: new Set(list.map(idOf)).size, at: Date.now() };
        save('imgdir', S.imgDir);
      }
      toast(dir ? `${S.imgDir.n} image(s) synchronisée(s)` : `Ajouté : ${list.map(idOf).join(', ')}`);
      refreshImgs();
    }, () => toast('Enregistrement impossible (stockage plein ou navigation privée ?)'));
}
