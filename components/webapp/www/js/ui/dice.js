/* Dés : panneau de lancer, journal, résultat en surimpression. */

function keepToggle() {
  return `<div class="seg" title="Dé bonus / dé malus sur le prochain d20">${[['', 'd20'], ['h', 'Bonus'], ['l', 'Malus']]
    .map(([v, l]) => `<button data-a="keep" data-v="${v}" class="${S.keep === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}

function diceUI(mjSecret) {
  return `<div class="card">
    <div class="dbtns">${[4, 6, 8, 10, 12, 20, 100].map(f => `<button class="die" data-a="die" data-f="${f}">d${f}</button>`).join('')}</div>
    <form class="row" data-form="roll">
      <input name="f" placeholder="ex : 2d6+3, 1d20+FOR" value="${esc(S.lastF)}" autocomplete="off" autocapitalize="characters">
      <button class="btn">Lancer</button>
    </form>
    <div class="row" style="margin-top:.5rem">${keepToggle()}
      ${mjSecret ? `<label class="chk"><input type="checkbox" data-a="secret"${S.secret ? ' checked' : ''}> Jet secret (visible du MJ seul)</label>` : ''}
    </div>
  </div>
  <h3>Journal des dés</h3>
  <ul class="log" data-log>${logHTML()}</ul>`;
}

function logHTML() {
  if (!S.log.length) return '<li class="muted">Aucun jet pour l’instant.</li>';
  return S.log.slice(-40).reverse().map(e => {
    const d = new Date(S.clock + e.ts);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const cls = [e.faces === 20 && e.nat === 20 ? 'crit' : '', e.faces === 20 && e.nat === 1 ? 'fumble' : '', e.secret ? 'secret' : ''].join(' ');
    const keep = e.keep === 'h' ? ' bonus' : e.keep === 'l' ? ' malus' : '';
    return `<li class="${cls}"><span class="t">${time}</span><span><b>${esc(e.who)}</b> ${esc(e.label)}${e.secret ? ' 🔒' : ''}</span>
      <b class="tot">${e.total}</b><span class="d">${esc(e.f)} [${e.rolls.join(', ')}]${keep}</span></li>`;
  }).join('');
}

function doRoll(who, label, f, opts = {}) {
  const rq = Math.random().toString(36).slice(2, 10);
  S.lastRq = rq;
  const keep = f.n === 1 && f.f === 20 ? S.keep : '';
  const ok = send({
    t: 'roll', who, label, n: f.n, f: f.f, mod: f.mod, keep, rq,
    secret: !!opts.secret, ...(S.isMJ ? { pin: S.pin } : {}),
  });
  if (!ok) return toast('Hors ligne : jet impossible');
  if (keep) { S.keep = ''; $$('[data-a=keep]').forEach(b => b.classList.toggle('on', b.dataset.v === '')); }
}

let rollT;
function showRoll(e) {
  const box = $('#roll');
  const cls = e.faces === 20 && e.nat === 20 ? 'crit' : e.faces === 20 && e.nat === 1 ? 'fumble' : '';
  const keep = e.keep === 'h' ? ' (dé bonus)' : e.keep === 'l' ? ' (dé malus)' : '';
  box.innerHTML = `<div class="box ${cls}">
    <div class="muted">${esc(e.label || e.f)}</div>
    <div class="total">${e.total}</div>
    <div class="small muted">${esc(e.f)} → [${e.rolls.join(', ')}]${keep}</div>
    ${cls === 'crit' ? '<div>✨ Réussite critique !</div>' : cls === 'fumble' ? '<div>💀 1 naturel !</div>' : ''}
  </div>`;
  box.hidden = false;
  clearTimeout(rollT);
  rollT = setTimeout(() => { box.hidden = true; }, 4000);
}

/* Nom affiché dans le journal pour les dés « libres ». */
function rollerName(c) {
  if (c) return c.name || 'Sans nom';
  return route()[0] === 'mj' ? 'MJ' : 'Joueur';
}
