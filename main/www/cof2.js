'use strict';
/* =====================================================================
 *  Données de jeu — Chroniques Oubliées Fantasy, 2e édition
 *  (voir references/COFv2/).
 *
 *  Complète cof2_drs.js (peuples, profils et voies du DRS, généré) avec
 *  ce que le DRS ne fournit pas sous forme exploitable : familles,
 *  bonus automatiques des capacités, équipement, états…
 * ===================================================================== */
const COF2 = {
  familles: {
    aventurier: { n: 'Aventuriers', pv: 4, dr: 8, pc: 1, drb: 0, note: '+1 PC' },
    combattant: { n: 'Combattants', pv: 5, dr: 10, pc: 0, drb: 0, note: '' },
    mage: { n: 'Mages', pv: 3, dr: 6, pc: 0, drb: 0, note: '+1 capacité de rang 2 au niveau 1, voie du mage possible' },
    mystique: { n: 'Mystiques', pv: 4, dr: 8, pc: 0, drb: 1, note: '+1 DR' },
  },

  /* Profils : famille, caractéristiques clés et de magie. Description, armes, équipement
     et voies viennent du DRS (cof2_drs.js). */
  profils: {
    arquebusier: { n: 'Arquebusier', f: 'aventurier', car: 'AGI, INT, CON', magie: '' },
    barde: { n: 'Barde', f: 'aventurier', car: 'CHA, AGI, VOL', magie: 'CHA' },
    rodeur: { n: 'Rôdeur', f: 'aventurier', car: 'AGI, PER, CON', magie: '' },
    voleur: { n: 'Voleur', f: 'aventurier', car: 'AGI, INT, CHA', magie: '' },
    barbare: { n: 'Barbare', f: 'combattant', car: 'FOR, CON, AGI', magie: '' },
    chevalier: { n: 'Chevalier', f: 'combattant', car: 'FOR, CHA, CON', magie: '' },
    guerrier: { n: 'Guerrier', f: 'combattant', car: 'FOR, CON, AGI', magie: '' },
    ensorceleur: { n: 'Ensorceleur', f: 'mage', car: 'CHA, VOL, AGI', magie: 'CHA' },
    forgesort: { n: 'Forgesort', f: 'mage', car: 'INT, VOL, CON', magie: 'INT' },
    magicien: { n: 'Magicien', f: 'mage', car: 'INT, VOL, AGI', magie: 'INT' },
    sorcier: { n: 'Sorcier', f: 'mage', car: 'INT, VOL, CON', magie: 'INT' },
    druide: { n: 'Druide', f: 'mystique', car: 'PER, VOL, CON ou AGI', magie: 'PER' },
    moine: { n: 'Moine', f: 'mystique', car: 'VOL, PER, AGI', magie: '' },
    pretre: { n: 'Prêtre', f: 'mystique', car: 'CHA, VOL, FOR', magie: 'CHA' },
  },

  /* Bonus permanents des capacités, par voie (id du DRS) puis par rang, appliqués automatiquement :
       def, init, pv, pm, pc, dr : nombre ou code de caractéristique ajouté
       car : { FOR: 1, … } bonus aux caractéristiques ; pmcar : caractéristique remplaçant la VOL pour les PM
       arme : { catégorie: { att, dm, crit, portee } } bonus avec les armes de cette catégorie (cat des armes
              ci‑dessous, ou contact / distance) : att et dm nombre ou caractéristique, crit élargit la zone
              de critique, portee multiplie la portée
     Les bonus conditionnels (sans armure, avec bouclier, au choix…) restent à saisir dans « bonus divers ». */
  fx: {
    'demi-orc': { 3: { arme: { contact: { crit: 1 } } }, 5: { car: { FOR: 1, CON: 1 } } },
    'elfe-haut': { 5: { car: { VOL: 1 } } },
    'elfe-sylvain': { 3: { arme: { arc: { crit: 1 } } }, 5: { car: { AGI: 1, PER: 1 } } },
    gnome: { 2: { pc: 1 }, 4: { arme: { arbalete: { dm: 'AGI' }, poudre: { dm: 'AGI' } } }, 5: { car: { CON: 1, CHA: 1 } } },
    halfelin: { 1: { def: 1 }, 4: { pc: 1 }, 5: { car: { AGI: 1, CON: 1 } } },
    humain: { 1: { pc: 1 }, 5: { car: { VOL: 1 } } },
    nain: { 2: { arme: { hache: { att: 1, dm: 1 }, marteau: { att: 1, dm: 1 } } }, 5: { car: { CON: 1, VOL: 1 } } },
    mage: { 3: { def: 1, pm: 2 }, 4: { car: { INT: 1, VOL: 1 } } },
    mercenaire: { 3: { def: 1 }, 4: { car: { CON: 1 } }, 5: { def: 1 } },
    pistolero: { 4: { car: { AGI: 1 } } },
    saltimbanque: { 2: { init: 'CHA', def: 1 }, 4: { def: 1 } },
    seduction: { 4: { car: { CHA: 1 }, pmcar: 'CHA' } },
    archer: { 1: { init: 1, arme: { arc: { dm: 'PER' } } }, 2: { init: 1 }, 3: { init: 1 }, 4: { init: 1 }, 5: { init: 1 } },
    roublard: { 1: { arme: { couteau: { dm: 1 } } }, 3: { arme: { couteau: { dm: 1 } } }, 5: { arme: { couteau: { dm: 1 } } } },
    explosifs: { 3: { arme: { poudre: { dm: 1 } } } },
    survie: { 4: { car: { CON: 1 } } },
    traqueur: { 4: { car: { PER: 1 } } },
    aventurier: { 3: { def: 2, init: 2 }, 4: { car: { CHA: 1 } }, 5: { def: 1, init: 1 } },
    deplacement: { 1: { def: 1, init: 1 }, 3: { def: 1, init: 1 }, 4: { car: { AGI: 1 } }, 5: { def: 1, init: 1 } },
    spadassin: { 1: { init: 'AGI' } },
    brute: { 1: { pv: 'FOR' }, 4: { car: { FOR: 1 } } },
    pagne: { 1: { pv: 1 }, 2: { pv: 1 }, 3: { pv: 1 }, 4: { pv: 1, car: { CON: 1 } }, 5: { pv: 1 } },
    pourfendeur: { 1: { init: 3, def: 1 }, 5: { def: 1 } },
    primitif: { 1: { pv: 1 } },
    guerre: { 4: { car: { FOR: 1 } } },
    preux: { 4: { car: { CHA: 1 } } },
    combat: { 1: { init: 3 } },
    resistance: { 1: { pv: 3 }, 2: { pv: 1 }, 3: { pv: 1 }, 4: { pv: 1, car: { CON: 1 } }, 5: { pv: 1, def: 1 } },
    soldat: { 4: { car: { FOR: 1 } }, 5: { def: 1 } },
    air: { 1: { init: 1, def: 1 } },
    divination: { 1: { init: 1, def: 1 }, 3: { init: 1, def: 1 }, 4: { car: { PER: 1 }, pm: 'PER' } },
    metal: { 5: { car: { CON: 1 }, pm: 'CON' } },
    runes: { 1: { def: 2 }, 3: { def: 1 }, 5: { def: 1 } },
    'outre-tombe': { 2: { def: 3 } },
    sang: { 3: { def: 2 }, 5: { def: 1 } },
    'sombre-magie': { 5: { car: { CON: 1 } } },
    fauve: { 1: { init: 3, def: 1 }, 3: { def: 1 }, 5: { def: 1 } },
    nature: { 4: { car: { CON: 1 } } },
    protecteur: { 4: { car: { PER: 1 }, pm: 'PER' } },
    'energie-vitale': { 5: { car: { CON: 1 } } },
    maitrise: { 1: { def: 2 }, 4: { def: 1 } },
    meditation: { 3: { init: 'VOL', pv: 'VOL', def: 2 }, 4: { car: { VOL: 1 } }, 5: { def: 1 } },
    poing: { 2: { def: 2 }, 5: { def: 1 } },
    vent: { 1: { init: 3 }, 2: { def: 1 }, 4: { car: { AGI: 1 } }, 5: { def: 1 } },
    priere: { 4: { car: { VOL: 1 } } },
    spiritualite: { 4: { car: { CHA: 1 } } },
  },

  /* Variantes de voies proposées par les règles, choisies sur la fiche.
       std : libellé de la version standard ; pour chaque variante :
       n libellé, v nouveau nom de la voie, note rappel affiché, fx bonus remplaçant ceux de fx (absent = inchangés). */
  variantes: {
    archer: {
      std: 'Arc',
      lancer: {
        n: 'Lancer (dague, hachette, javelot…)', v: 'Voie du lancer', fx: { 1: { arme: { jet: { dm: 'FOR', portee: 2 } } } },
        note: 'Les capacités de la voie s’appliquent aux armes de jet plutôt qu’à l’arc ; pas de bonus d’Init.',
      },
    },
    'compagnon-animal': {
      std: 'Loup',
      ours: {
        n: 'Ours', v: 'Voie du montreur d’ours',
        note: 'Rang 2 : bonus en intimidation et en spectacle au lieu de pister et surprise. Compagnon : −2 DEF, +2 FOR (+2 DM).',
      },
    },
    fauve: {
      std: 'Fauve',
      ours: {
        n: 'Ours', v: 'Voie du montreur d’ours',
        note: 'Rang 2 : bonus en intimidation et en spectacle au lieu de pister et surprise. Compagnon : −2 DEF, +2 FOR (+2 DM).',
      },
    },
    spiritualite: {
      std: 'Standard',
      guerrier: {
        n: 'Divinité guerrière',
        note: 'Vêtements sacrés : maîtrise de la cotte de mailles (DEF +5) et capacités de prêtre utilisables avec cette armure (profil hybride : maîtrise de la chemise de mailles requise).',
      },
    },
  },

  /* Anciens identifiants (version précédente de l'appli) → identifiants du DRS. */
  legacy: {
    demielfe: 'demi-elfe', demiorc: 'demi-orc', elfehaut: 'elfe-haut', elfesylvain: 'elfe-sylvain',
    compagnon: 'compagnon-animal', deuxarmes: 'combat-deux-armes', maitrearmes: 'maitre-armes', meneur: 'meneur-hommes',
    energie: 'energie-vitale', arcanes: 'magie-arcanes', destructrice: 'magie-destructrice', elementaire: 'magie-elementaire',
    protectrice: 'magie-protectrice', universelle: 'magie-universelle', sombre: 'sombre-magie', outretombe: 'outre-tombe',
    guerresainte: 'guerre-sainte',
  },

  /* [id, nom, attaque, dé de DM, options] — FOR ajoutée automatiquement au contact.
     cat : catégories (séparées par des espaces) visées par les bonus de capacités (fx.arme). */
  armes: [
    ['mains', 'Mains nues', 'contact', '1d3', { note: 'DM temporaires' }],
    ['baton', 'Bâton', 'contact', '1d4', { note: '2 mains' }],
    ['batonferre', 'Bâton ferré', 'contact', '1d6', { note: '2 mains' }],
    ['dague', 'Dague', 'contact', '1d4', { note: 'légère' }],
    ['epee2m', 'Épée à deux mains', 'contact', '2d6', { note: '2 mains' }],
    ['batarde1', 'Épée bâtarde (1 main)', 'contact', '1d8'],
    ['batarde2', 'Épée bâtarde (2 mains)', 'contact', '1d12', { note: '2 mains' }],
    ['epeecourte', 'Épée courte', 'contact', '1d6', { note: 'légère' }],
    ['epeelongue', 'Épée longue', 'contact', '1d8'],
    ['epieu1', 'Épieu / lance (1 main)', 'contact', '1d6'],
    ['epieu2', 'Épieu / lance (2 mains)', 'contact', '1d10', { note: '2 mains' }],
    ['fleau', 'Fléau', 'contact', '1d6', { note: 'relance 1 attaque ratée/combat' }],
    ['fleau2m', 'Fléau à deux mains', 'contact', '1d10', { note: '2 mains, relance 1 attaque ratée/combat' }],
    ['gourdin', 'Gourdin', 'contact', '1d4', { note: 'DM temporaires possibles' }],
    ['hache', 'Hache', 'contact', '1d8', { cat: 'hache' }],
    ['hache2m', 'Hache à deux mains', 'contact', '2d6', { cat: 'hache', note: '2 mains' }],
    ['lancecav', 'Lance de cavalerie', 'contact', '2d6', { note: 'dé malus sauf en charge à cheval' }],
    ['marteau', 'Marteau', 'contact', '1d6', { cat: 'marteau' }],
    ['masse', 'Masse', 'contact', '1d6'],
    ['pique', 'Pique', 'contact', '1d10', { note: '2 mains, spécial' }],
    ['rapiere', 'Rapière', 'contact', '1d6', { crit: 19, note: 'légère' }],
    ['stylet', 'Stylet', 'contact', '1d3', { nofor: true, note: 'légère ; 1d6+AGI sur cible surprise' }],
    ['vivelame', 'Vivelame', 'contact', '1d10', { crit: 19, note: '2 mains' }],
    ['arbpoing', 'Arbalète de poing', 'distance', '1d6', { cat: 'arbalete', portee: 10, note: 'recharge (M)' }],
    ['arblegere', 'Arbalète légère', 'distance', '2d4', { cat: 'arbalete', portee: 30, note: 'recharge (M), 2 mains' }],
    ['arblourde', 'Arbalète lourde', 'distance', '2d6', { cat: 'arbalete', portee: 60, note: 'recharge (L), 2 mains' }],
    ['arccourt', 'Arc court', 'distance', '1d6', { cat: 'arc', portee: 30, note: '2 mains' }],
    ['arclong', 'Arc long', 'distance', '1d8', { cat: 'arc', portee: 50, note: '2 mains, FOR +1 min.' }],
    ['couteaux', 'Couteaux de lancer', 'distance', '1d4', { cat: 'jet couteau', portee: 10 }],
    ['daguel', 'Dague (lancer)', 'distance', '1d4', { cat: 'jet couteau', portee: 5 }],
    ['fronde', 'Fronde', 'distance', '1d4', { portee: 20 }],
    ['hachette', 'Hachette (lancer)', 'distance', '1d6', { cat: 'jet hache', portee: 5 }],
    ['javelot', 'Javelot', 'distance', '1d6', { cat: 'jet', portee: 20 }],
    ['lancel', 'Lance / épieu (lancer)', 'distance', '1d6', { cat: 'jet', portee: 10 }],
    ['lancepierre', 'Lance-pierre', 'distance', '1d3', { portee: 10 }],
    ['petoire', 'Pétoire', 'distance', '1d10', { cat: 'poudre', portee: 20, note: 'arme à poudre, recharge (L)' }],
    ['mousquet', 'Mousquet', 'distance', '2d6', { cat: 'poudre', portee: 50, note: 'arme à poudre, recharge (L), 2 mains' }],
  ],

  /* [id, nom, DEF, AGI max] */
  armures: [
    ['', 'Aucune', 0, 99],
    ['matelasse', 'Tissus matelassés, fourrures', 1, 7],
    ['cuir', 'Cuir simple', 2, 6],
    ['cuirrenforce', 'Cuir renforcé, broigne', 3, 5],
    ['chemise', 'Chemise de mailles', 4, 4],
    ['cotte', 'Cotte de mailles', 5, 3],
    ['plaques', 'Armure de plaques', 6, 2],
    ['plaquecomplete', 'Plaque complète', 7, 1],
  ],
  boucliers: [['', 'Aucun', 0], ['petit', 'Petit bouclier', 1], ['grand', 'Grand bouclier', 2]],

  etats: [
    ['Affaibli', 'dé malus à tous les tests'],
    ['Aveuglé', '−5 Init, attaque et DEF ; −10 à distance'],
    ['Essoufflé', 'déplacement limité à 5 m par action de mouvement'],
    ['Étourdi', 'aucune action, −5 DEF'],
    ['Immobilisé', 'aucun déplacement, dé malus en attaque'],
    ['Invalide', 'déplacement limité à 5 m par action de mouvement'],
    ['Paralysé', 'aucune action, toute attaque touche et fait un critique'],
    ['Ralenti', 'une seule action par round (A ou M)'],
    ['Renversé', '−5 attaque et DEF ; se relever = action d’attaque'],
    ['Surpris', 'aucune action et −5 DEF au 1er round'],
    ['Inconscient', '0 PV : −1 DR, mort sans soins dans l’heure'],
  ],

  ideaux: ['Abnégation', 'Clémence', 'Compassion', 'Courage', 'Égalité', 'Éducation', 'Fraternité', 'Frugalité', 'Générosité', 'Honnêteté', 'Honneur', 'Humilité', 'Justice', 'Liberté', 'Loyauté', 'Pacifisme', 'Protection', 'Sens du sacrifice', 'Solidarité', 'Vérité'],
  travers: ['Alcoolique', 'Couard', 'Crédule', 'Cupide', 'Colérique', 'Distrait', 'Dragueur', 'Fanfaron', 'Gourmand', 'Grossier', 'Impatient', 'Indécis', 'Menteur', 'Orgueilleux', 'Paranoïaque', 'Paresseux', 'Phobie', 'Timide', 'Violent', 'Voleur'],

  series: [['Polyvalent', '+2, +2, +2, +1, +1, 0, −1'], ['Expert', '+3, +2, +1, +1, 0, 0, −1'], ['Spécialiste', '+4, +2, +1, 0, 0, −1, −1']],
  niveauRang: [0, 1, 2, 3, 5, 7],
};
