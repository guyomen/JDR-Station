/* Vue : onglet Voies de la fiche. */

function voieOptions(c) {
  const taken = new Set(c.voies.map(v => v.id));
  const prof = COF2.profils[c.profil];
  const peup = COF2.peuples[c.peuple];
  const opt = id => [id, COF2.voies[id].n];
  const free = ids => ids.filter(id => !taken.has(id)).map(opt);
  const g = {};
  g['— Ajouter une voie —'] = [['', '— Ajouter une voie —']];
  const fam = prof && COF2.familles[prof.f];
  const famName = f => (COF2.familles[f] ? COF2.familles[f].n : f);
  if (prof) g[`Profil : ${prof.n}`] = free(prof.voies);
  if (peup) g[`Peuple : ${peup.n}`] = free(peup.voies);
  if (fam && fam.alt && COF2.voies[fam.alt]) g[`${fam.n} (remplace la voie de peuple)`] = free([fam.alt]);
  const prestige = f => Object.keys(COF2.voies).filter(id => COF2.voies[id].prestige && COF2.voies[id].f === f)
    .sort((x, y) => COF2.voies[x].n.localeCompare(COF2.voies[y].n));
  const prestigeFams = [...new Set(Object.values(COF2.voies).filter(v => v.prestige).map(v => v.f))];
  if (prof) g[`Prestige ${famName(prof.f)} (niv. 5+)`] = free(prestige(prof.f));
  for (const f of prestigeFams.filter(familleOuverte)) g[`Prestige ${famName(f)} (niv. 5+)`] = free(prestige(f));
  for (const [pid, p] of Object.entries(COF2.profils)) {
    if (pid !== c.profil) g[`${p.n} (hybride, accord du MJ)`] = free(p.voies);
  }
  for (const f of prestigeFams) {
    if ((!prof || f !== prof.f) && !familleOuverte(f)) g[`Prestige ${famName(f)} (autre famille)`] = free(prestige(f));
  }
  /* Voies rattachées à aucun profil ni peuple (ajoutées par la table, par exemple). */
  const listed = new Set([...Object.values(COF2.profils).flatMap(p => p.voies), ...Object.values(COF2.peuples).flatMap(p => p.voies),
    ...Object.values(COF2.familles).map(f => f.alt)]);
  g['Autres voies'] = free(Object.keys(COF2.voies).filter(id => !COF2.voies[id].prestige && !listed.has(id)));
  g['Autre'] = [['libre', 'Voie personnalisée…']];
  return g;
}

function voiesPane(c, can, k) {
  const dis = can ? '' : ' disabled';
  const niv = n(c.niveau);
  const peupleIds = new Set([...(COF2.peuples[c.peuple] ? COF2.peuples[c.peuple].voies : []), ...(k.fam && k.fam.alt ? [k.fam.alt] : [])]);
  const count = c.voies.filter(v => !peupleIds.has(v.id) && voieDef(v).kind !== 'prestige').length;
  const nPrestige = c.voies.filter(v => voieDef(v).kind === 'prestige').length;
  const cards = c.voies.map((v, i) => {
    const d = voieDef(v);
    const pre = d.kind === 'prestige';
    const rang = n(v.rang);
    const caps = d.caps.map((cap, r0) => {
      const r = r0 + 1;
      const req = COF2.niveaux[cap.rang] || cap.rang;
      const r2niv1 = r === 2 && k.fam && k.fam.r2niv1; // capacité de rang 2 au niveau 1 (mages)
      const late = r <= rang && niv < req && !r2niv1;
      const key = `${v.id}.${r}`;
      return `<div class="caprow">
        <button class="cap ${r <= rang ? 'on' : ''} ${late ? 'late' : ''}" data-a="rang" data-i="${i}" data-r="${r}"${dis}>
          <span class="rk">${cap.rang}</span>
          <span class="grow"><b>${esc(cap.name)}</b>${cap.spell ? ' <span class="spell" title="Sort">✦</span>' : ''}${cap.act ? ` <span class="act" title="${ACTION_LABEL[cap.act] || ''}">${esc(cap.act)}</span>` : ''}</span>
          <small class="muted">niv. ${req}</small>
        </button>
        ${cap.text ? `<button class="info-btn ${S.openCaps.has(key) ? 'on' : ''}" data-a="capinfo" data-key="${esc(key)}" title="Description">ⓘ</button>` : ''}
        ${cap.text ? `<div class="captext" data-cap="${esc(key)}"${S.openCaps.has(key) ? '' : ' hidden'}>${md(cap.text)}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="entry voie">
      <div class="vhead"><b>${esc(voieNom(v))}</b>${pre ? '<span class="badge">prestige</span>' : ''}<span class="badge">rang ${rang && d.caps.length ? d.caps[Math.min(rang, d.caps.length) - 1].rang : 0}</span>
        <button class="x" data-a="del" data-list="voies" data-i="${i}" title="Retirer la voie">✕</button></div>
      ${d.intro ? `<details class="small"><summary>Présentation</summary>${md(d.intro)}</details>` : ''}
      ${d.kind === 'libre' ? `<label class="f"><span>Nom de la voie</span><input data-p="voies.${i}.nom" value="${esc(v.nom)}"${dis}></label>` : ''}
      ${COF2.variantes[v.id] ? `<label class="f"><span>Variante</span>${selectHTML(`voies.${i}.variante`, variante(v) ? v.variante : '',
        Object.entries(COF2.variantes[v.id]).map(([key, o]) => [key === 'std' ? '' : key, typeof o === 'string' ? o : o.n]), dis)}</label>` : ''}
      ${variante(v) && variante(v).note ? `<p class="small muted">${esc(variante(v).note)}</p>` : ''}
      <div class="caps">${caps}</div>
      <label class="f"><span>Notes (capacité choisie, précisions…)</span><input data-p="voies.${i}.notes" value="${esc(v.notes)}"${dis}></label>
    </div>`;
  }).join('');
  return `
    <p class="small muted">Touchez une capacité pour fixer le rang atteint, ⓘ pour lire sa description. Voies : ${count} / ${MAX_VOIES} (+ voie de peuple${nPrestige ? ', + prestige' : ''}) · ${k.sorts} sort(s) ✦ · coût : rangs 1-2 = 1 point, rang 3+ = 2 points ; 2 points par niveau.</p>
    ${count > MAX_VOIES ? '<p class="warn small">Maximum 6 voies + la voie de peuple.</p>' : ''}
    ${nPrestige > 1 ? '<p class="warn small">Une seule voie de prestige par personnage.</p>' : ''}
    ${!c.voies.length ? '<p class="muted">Au niveau 1 : 2 voies de profil + la voie de peuple, au rang 1 (mages : + 1 capacité de rang 2).</p>' : ''}
    ${cards}
    ${can ? `<label class="f"><span>Nouvelle voie</span>${selectHTML('', '', voieOptions(c), ' data-a-change="addvoie"')}</label>` : ''}`;
}
