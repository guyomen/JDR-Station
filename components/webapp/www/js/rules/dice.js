/* Formules de dés saisies par les joueurs. */

/* « 2d6+3 », « 1d8+FOR », « d20-1 » → { n, f, mod } (un seul type de dé). */
function parseFormula(str, c) {
  const s = String(str || '').toUpperCase().replace(/\s+/g, '');
  if (!s) return null;
  const car = c ? calc(c).car : null;
  const re = /([+-]?)(\d*D\d+|\d+|[A-Z]{3})/g;
  let m, pos = 0, dice = null, mod = 0;
  while ((m = re.exec(s))) {
    if (m.index !== pos) return null;
    pos = re.lastIndex;
    const sign = m[1] === '-' ? -1 : 1;
    const tok = m[2];
    if (tok.includes('D')) {
      if (dice || sign < 0) return null;
      const [a, b] = tok.split('D');
      dice = { n: a ? +a : 1, f: +b };
    } else if (/^\d+$/.test(tok)) mod += sign * +tok;
    else if (car && tok in car) mod += sign * car[tok];
    else if (c && tok === 'NIV') mod += sign * n(c.niveau);
    else return null;
  }
  if (pos !== s.length || !dice || dice.n < 1 || dice.n > 20 || dice.f < 2) return null;
  return { n: dice.n, f: dice.f, mod };
}
