/* Données de jeu : COF2 (data/cof2.js) + COF2_DRS (data/cof2_drs.js, généré depuis le DRS).
 * Fusionne les deux sources et prépare les tables utilisées par les règles et l'interface. */

/* Fusion : voies, peuples et textes des profils viennent du DRS. */
COF2.voies = Object.fromEntries(Object.entries(COF2_DRS.voies).map(([id, [n, f, prestige, intro, caps]]) => [id, {
  n, f, prestige: !!prestige, intro, fx: COF2.fx[id],
  caps: caps.map(([name, spell, act, text]) => ({ name, spell: !!spell, act, text })),
}]));
COF2.peuples = Object.fromEntries(Object.entries(COF2_DRS.peuples).filter(([id]) => id !== 'mage')
  .map(([id, p]) => [id, { n: p.n, mod: p.m, voies: p.v }]));
for (const [id, p] of Object.entries(COF2.profils)) {
  const d = COF2_DRS.profils[id] || {};
  Object.assign(p, { desc: d.d || '', armes: d.a || '', equip: d.e || '', extra: d.x || '', bonus: d.b || [], voies: d.v || [] });
}
const FAM_LABEL = { aventurier: 'Aventuriers', combattant: 'Combattants', mage: 'Mages', mystique: 'Mystiques', generique: 'Génériques' };
const PRESTIGE_NIV = [5, 7, 9, 11, 13];

const CARACS = [
  ['AGI', 'Agilité'], ['CON', 'Constitution'], ['FOR', 'Force'], ['PER', 'Perception'],
  ['CHA', 'Charisme'], ['INT', 'Intelligence'], ['VOL', 'Volonté'],
];
const DERIVED = [
  ['def', 'DEF', 'Défense'], ['init', 'Init', 'Initiative'], ['contact', 'Contact', 'Attaque au contact'],
  ['distance', 'Dist.', 'Attaque à distance'], ['magique', 'Magie', 'Attaque magique'],
];
const RES = [['pv', 'PV', 'Points de vigueur'], ['dr', 'DR', 'Dés de récupération'], ['pc', 'PC', 'Points de chance'], ['pm', 'PM', 'Points de mana']];
const DIVERS = [['def', 'DEF'], ['init', 'Init'], ['contact', 'Contact'], ['distance', 'Distance'], ['magique', 'Magie'], ['pv', 'PV max'], ['dr', 'DR max'], ['pc', 'PC max'], ['pm', 'PM max']];
const ATTACKS = [['contact', 'Contact'], ['distance', 'Distance'], ['magique', 'Magique']];
const MAX_VOIES = 6;

const WEAPONS = Object.fromEntries(COF2.armes.map(([id, nom, att, dm, o]) => [id, { id, nom, att, dm, ...(o || {}) }]));
const ARMURES = Object.fromEntries(COF2.armures.map(([id, nom, def, agi]) => [id, { nom, def, agi }]));
const BOUCLIERS = Object.fromEntries(COF2.boucliers.map(([id, nom, def]) => [id, { nom, def }]));
const ETAT_INFO = Object.fromEntries(COF2.etats);

const ACTION_LABEL = { A: 'Action d’attaque', L: 'Action limitée', M: 'Action de mouvement', G: 'Action gratuite' };
