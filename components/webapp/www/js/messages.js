/* Messages reçus de la station (protocole : docs/protocol.md). */

function onMsg(m) {
  switch (m.t) {
    case 'state':
      S.ready = true;
      S.clock = Date.now() - m.now;
      S.chars = m.chars.map(norm);
      S.log = m.log || [];
      S.peers = m.peers || [];
      S.lieux = m.lieux || [];
      if (!S.isMJ) S.pub = normCombat(m.combat);
      peersChanged();
      update();
      break;
    case 'char': {
      const c = norm(m.char);
      const pend = S.pending[c.id];
      if (pend) for (const p in pend) setPath(c, p, pend[p]);
      const i = S.chars.findIndex(x => x.id === c.id);
      if (i >= 0) S.chars[i] = c; else S.chars.push(c);
      if (i < 0 && S.isMJ) send({ t: 'auth', pin: S.pin }); // rafraîchit les codes
      update();
      break;
    }
    case 'del': {
      S.chars = S.chars.filter(c => c.id !== m.id);
      const r = route();
      if ((r[0] === 'c' && r[1] === m.id) || (r[2] === m.id)) location.hash = r[0] === 'mj' ? '#/mj' : '#/joueur';
      update();
      break;
    }
    case 'log':
      S.log.push(m.e);
      if (S.log.length > 80) S.log.shift();
      if (m.e.rq && m.e.rq === S.lastRq) showRoll(m.e);
      $$('[data-log]').forEach(el => { el.innerHTML = logHTML(); });
      break;
    case 'auth':
      if (m.ok !== S.isMJ) sendPresence();
      S.isMJ = m.ok;
      if (m.ok) {
        S.tokens = m.tokens || {};
        save('pin', S.pin);
        if (!S.combatDirty) { S.combat = normCombat(m.combat); migrateNpcs(); }
      }
      else if (S.pin) { toast('Code MJ incorrect'); S.pin = ''; save('pin', ''); }
      update();
      break;
    case 'peers':
      S.peers = m.list || [];
      peersChanged();
      break;
    case 'lieux':
      S.lieux = m.list || [];
      if (['global', 'mj'].includes(route()[0])) update();
      break;
    case 'combat':
      if (S.isMJ) break; // le MJ a déjà la version complète
      S.pub = normCombat(m.combat);
      if (route()[0] === 'global') update();
      break;
    case 'you':
      S.me = m.id;
      peersChanged();
      break;
    case 'created':
      S.mine[m.id] = m.token;
      save('mine', S.mine);
      sendPresence();
      S.tab = 'perso';
      location.hash = '#/c/' + m.id;
      break;
    case 'claim':
      if (m.ok) {
        S.mine[m.id] = m.token;
        save('mine', S.mine);
        const c = byId(m.id);
        if (c && S.player && c.player !== S.player) change(c, 'player', S.player, true);
        sendPresence();
        toast('Personnage récupéré !');
        update();
      }
      else toast('Code incorrect');
      break;
    case 'err':
      toast(m.m);
      break;
  }
}

/* Seul l'espace global affiche les connectés : inutile de re-rendre les autres pages. */
function peersChanged() {
  const b = $('#peers');
  if (b) b.textContent = S.peers.length || '';
  if (['global', undefined].includes(route()[0])) update();
}
