/* Préférences de cet appareil (localStorage, préfixe « jdr. »). */

function load(k, d) { try { const v = localStorage.getItem('jdr.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem('jdr.' + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
