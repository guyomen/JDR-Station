/* État de l'appli sur cet appareil. */

const S = {
  ready: false, chars: [], log: [], clock: Date.now(),
  /* Un appareil = un utilisateur : profil choisi à la première connexion (joueur, mj ou ecran). */
  role: load('role', load('screen', false) ? 'ecran' : load('pin', '') ? 'mj' : ''),
  player: load('player', ''),      // nom de l'utilisateur de cet appareil, repris sur ses personnages
  mine: load('mine', {}),          // id -> code de reprise (personnages de cet appareil)
  pin: load('pin', ''), isMJ: false, tokens: {},
  pending: {},                     // id -> { chemin: valeur } en attente d'envoi
  tab: 'perso', mjtab: 'groupe', keep: '', secret: false, lastRq: '', lastF: '',
  combat: normCombat({}),          // initiative complète (MJ) : PNJ avec PV, tour en cours
  pub: normCombat({}),             // version publique diffusée par la station
  combatDirty: false,
  screen: load('screen', false),   // mode écran partagé (espace global plein écran)
  openCaps: new Set(),             // descriptions de capacités dépliées
  needRender: false, ws: null,
  peers: [], me: -1,               // appareils connectés (cf. presence), dont celui-ci
  avatars: {},                     // id -> version de la miniature gardée par la station
  lieux: [],                       // lieux connus de la station [{id, n}] : le MJ choisit parmi eux
  imgs: [], imgNames: {}, thumbs: {}, imgErr: false, // images de lieux de cet appareil (ID, noms, miniatures), stockage local indisponible
  imgDir: load('imgdir', null),    // dossier d'images synchronisé : { name, n, at }
  imgFit: load('imgfit', {}),      // cadrage des lieux sur cet écran : id -> 'height' | 'width' (absent = plein écran)
  imgBg: load('imgbg', {}),        // fond des lieux (transparence, bandes) : id -> 'white' (absent = noir)
};
const byId = id => S.chars.find(c => c.id === id);
