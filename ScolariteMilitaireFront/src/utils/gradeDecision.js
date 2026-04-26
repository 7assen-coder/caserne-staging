/** Libellés officiels-style pour le relevé de notes en ligne. */
export const DECISION_CODE_LABELS = {
  V: 'Em — Validé',
  NV: 'Em — Non validé',
  E: 'Moyenne éliminatoire',
  VCI: 'Em — Validé par compensation interne (VCI)',
  VCE: 'Em — Validé par compensation globale (VCE)',
};

/**
 * Décision affichable pour une ligne de module.
 * @param {object} m
 * @returns {keyof typeof DECISION_CODE_LABELS}
 */
export function getDecisionCode(m) {
  if (m?.codeDecision) return m.codeDecision;
  const n = Number(m?.note);
  if (Number.isFinite(n) && n < 8) return 'E';
  if (m?.valide) return 'V';
  return 'NV';
}

export function getDecisionLabel(m) {
  return DECISION_CODE_LABELS[getDecisionCode(m)] ?? getDecisionCode(m);
}
