/* Miniatures des personnages : l'image choisie est recadrée en carré de 192 px et compressée en JPEG
 * dans le navigateur, puis gardée par la station (≤ 15 Ko). L'image d'origine ne quitte pas l'appareil. */

const AV_SIZE = 192, AV_MAX = 15 * 1024;

const avatarURL = id => (S.avatars[id] ? `/av/${id}.jpg?v=${S.avatars[id]}` : '');
/* Miniature du personnage ; sans image, son initiale si placeholder, sinon rien. */
function avatarHTML(c, cls = '', placeholder = false) {
  const u = avatarURL(c.id);
  if (u) return `<img class="av ${cls}" src="${u}" alt="">`;
  return placeholder ? `<span class="av none ${cls}">${esc([...(c.name || '?').trim()][0] || '?').toUpperCase()}</span>` : '';
}

/* Champ hors de #app : un re-rendu pendant la sélection ne doit pas la faire perdre. */
function pickAvatar(c) {
  const inp = document.createElement('input');
  Object.assign(inp, { type: 'file', accept: 'image/*', hidden: true });
  inp.addEventListener('change', () => {
    const f = inp.files[0];
    inp.remove();
    if (!f) return;
    makeAvatar(f).then(data => {
      if (!send({ t: 'avatar', id: c.id, data, ...authFor(c.id) })) toast('Hors ligne');
    }, () => toast('Image illisible'));
  });
  document.body.append(inp);
  inp.click();
}
function removeAvatar(c) {
  if (!confirm('Retirer l’image de ce personnage ?')) return;
  if (!send({ t: 'avatar', id: c.id, data: '', ...authFor(c.id) })) toast('Hors ligne');
}

/* Recadrage carré (centré ; un peu vers le haut pour un portrait, où se trouve le visage),
 * puis qualité JPEG abaissée jusqu'à tenir dans AV_MAX. Renvoie le JPEG en base64. */
function makeAvatar(file) {
  return new Promise((ok, ko) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('image illisible')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth, h = img.naturalHeight, s = Math.min(w, h);
      const cv = document.createElement('canvas');
      cv.width = cv.height = AV_SIZE;
      const g = cv.getContext('2d');
      g.fillStyle = '#231b15'; // fond des images transparentes
      g.fillRect(0, 0, AV_SIZE, AV_SIZE);
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (w - s) / 2, (h - s) * 0.2, s, s, 0, 0, AV_SIZE, AV_SIZE);
      for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
        const data = cv.toDataURL('image/jpeg', q).split(',')[1];
        if (data.length * 3 / 4 <= AV_MAX) return ok(data);
      }
      ko(new Error('image trop lourde'));
    };
    img.src = url;
  });
}
