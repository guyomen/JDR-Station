/* Chargement des règles au démarrage : les documents servis par la station (ceux de la table si le MJ
 * en a envoyé, sinon ceux d'origine) sont lus (parse.js) puis appliqués (tables.js). */

const RULES_DOCS = {
  regles: 'Aide-mémoire',
  familles: 'Familles',
  profils: 'Profils',
  peuples: 'Peuples',
  voies: 'Voies',
  prestige: 'Prestige',
  equipement: 'Équipement',
};
const RULES = {
  texts: {},      // doc -> Markdown en vigueur (affiché aussi dans l'Espace Règles)
  warnings: [],   // incohérences relevées à la lecture (montrées au MJ)
  origine: false, // true : les documents de la table étaient inutilisables, ceux d'origine sont utilisés
  custom: null,   // documents de la table sur la station : { doc: octets } (cf. /regles/index.json)
  model: null,    // modèle en vigueur (parseRules), pour comparer avec des documents modifiés
};

async function fetchRuleTexts(origine) {
  const entries = await Promise.all(Object.keys(RULES_DOCS).map(async d => {
    const r = await fetch(`/regles/${d}.md${origine ? '?origine' : ''}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${d}.md : erreur ${r.status}`);
    return [d, await r.text()];
  }));
  return Object.fromEntries(entries);
}

/* Lit des documents sans rien appliquer : { model, warnings, error }. error : règles inutilisables. */
function readRules(texts) {
  const warnings = [];
  const model = parseRules(texts, w => warnings.push(w));
  const missing = [['profils', 'aucun profil'], ['peuples', 'aucun peuple'], ['voies', 'aucune voie']]
    .filter(([k]) => !Object.keys(model[k]).length).map(([, m]) => m);
  if (!model.armes.length) missing.push('aucune arme');
  return { model, warnings, error: missing.join(', ') };
}

/* Lit puis met en service des documents ; renvoie les avertissements (erreur si inutilisables). */
function applyRules(texts) {
  const r = readRules(texts);
  if (r.error) throw new Error(r.error);
  useRules(buildRules(r.model, w => r.warnings.push(w)));
  RULES.texts = texts;
  RULES.model = r.model;
  return r.warnings;
}

async function loadRules() {
  S.rules = 'loading';
  try {
    const texts = await fetchRuleTexts(false);
    try {
      RULES.warnings = applyRules(texts);
      RULES.origine = false;
    } catch (e) {
      /* Documents de la table illisibles : la partie continue avec ceux d'origine (le MJ est prévenu). */
      RULES.warnings = [`Les règles de la table sont inutilisables (${e.message}) : règles d’origine utilisées.`, ...applyRules(await fetchRuleTexts(true))];
      RULES.origine = true;
    }
    S.rules = 'ok';
  } catch (e) {
    console.error(e);
    S.rules = 'error';
  }
}

/* Version des règles annoncée par la station (state.rv, message regles) : si elle change, on recharge. */
function rulesVersion(v) {
  if (v == null) return;
  if (S.rulesV == null) { S.rulesV = v; return; }
  if (v === S.rulesV) return;
  S.rulesV = v;
  toast('Règles de la table mises à jour : rechargement…');
  S.reload = true;
  setTimeout(reloadIfIdle, 1500);
}
function reloadIfIdle() {
  if (!S.reload) return;
  if (isEditing() || S.rulesBusy) { setTimeout(reloadIfIdle, 2000); return; }
  flush();
  if (S.isMJ) flushCombat();
  setTimeout(() => location.reload(), 300);
}
