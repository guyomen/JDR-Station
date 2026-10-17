/* Complète les fiches reçues et convertit celles des versions précédentes de l'appli. */

/* Anciens identifiants (version précédente de l'appli) → identifiants des documents de règles. */
const LEGACY_IDS = {
  demielfe: 'demi-elfe', demiorc: 'demi-orc', elfehaut: 'elfe-haut', elfesylvain: 'elfe-sylvain',
  compagnon: 'compagnon-animal', deuxarmes: 'combat-deux-armes', maitrearmes: 'maitre-armes', meneur: 'meneur-hommes',
  energie: 'energie-vitale', arcanes: 'magie-arcanes', destructrice: 'magie-destructrice', elementaire: 'magie-elementaire',
  protectrice: 'magie-protectrice', universelle: 'magie-universelle', sombre: 'sombre-magie', outretombe: 'outre-tombe',
  guerresainte: 'guerre-sainte',
};
function findId(table, val) {
  if (typeof val !== 'string' || !val) return '';
  if (table[val]) return val;
  const f = fold(val);
  return Object.keys(table).find(id => fold(table[id].n || table[id].nom) === f) || '';
}
/* Retrouve une voie par son nom, avec ou sans « Voie de la / du … ». */
const bareVoie = s => fold(s).replace(/^voie (de la |de l'|de l’|du |des |de |d')/, '');
function voieByName(name) {
  const f = bareVoie(name);
  return f ? Object.keys(COF2.voies).find(id => bareVoie(COF2.voies[id].n) === f) || '' : '';
}
function migrateVoie(v) {
  let id = v.id ? LEGACY_IDS[v.id] || v.id : voieByName(v.nom);
  if (id && id.startsWith('p:')) id = voieByName(id.slice(2));
  return { ...v, id: COF2.voies[id] ? id : 'libre', nom: v.nom || (v.id && v.id.startsWith('p:') ? v.id.slice(2) : ''), notes: v.notes || v.cap || '' };
}
/* Complète une fiche reçue et convertit les fiches des versions précédentes. */
function norm(raw) {
  const c = merge(blankChar(), raw);
  c.peuple = findId(COF2.peuples, LEGACY_IDS[c.peuple] || c.peuple);
  c.profil = findId(COF2.profils, c.profil);
  if (typeof c.armure !== 'string') c.armure = findId(ARMURES, c.armure && c.armure.nom);
  if (typeof c.bouclier !== 'string') c.bouclier = n(c.bouclier && c.bouclier.def) >= 2 ? 'grand' : n(c.bouclier && c.bouclier.def) ? 'petit' : '';
  c.armes = c.armes.map(w => (w.id ? w : { id: 'autre', nom: w.nom, att: w.att, dm: w.dm }));
  c.voies = c.voies.map(migrateVoie);
  return c;
}
