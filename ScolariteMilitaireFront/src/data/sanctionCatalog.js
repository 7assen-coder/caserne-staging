/** Catalogue des natures de sanction — frontend-only. */

export const SANCTION_NATURES = [
  { value: 'avertissement', label: 'Avertissement', codePrefix: 'AVT' },
  { value: 'blame', label: 'Blâme', codePrefix: 'BLM' },
  { value: 'retrait', label: 'Retrait', codePrefix: 'RET' },
  { value: 'consigne', label: 'Consigne', codePrefix: 'CSG' },
  { value: 'heures_sup', label: 'Heures supplémentaires', codePrefix: 'HS' },
  { value: 'autre', label: 'Autre', codePrefix: 'SAN' },
];

export const SANCTION_STATUTS = [
  { value: 'en_cours', label: 'En cours' },
  { value: 'cloturee', label: 'Clôturée' },
  { value: 'annulee', label: 'Annulée' },
];

export function sanctionNatureLabel(value) {
  return SANCTION_NATURES.find((n) => n.value === value)?.label ?? value ?? '—';
}

export function sanctionStatutLabel(value) {
  return SANCTION_STATUTS.find((s) => s.value === value)?.label ?? value ?? '—';
}

export function buildSanctionCode(natureValue, seq = 1) {
  const nature = SANCTION_NATURES.find((n) => n.value === natureValue);
  const prefix = nature?.codePrefix ?? 'SAN';
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

export function nextSanctionSeqForEleve(existingItems = [], natureValue) {
  const prefix = SANCTION_NATURES.find((n) => n.value === natureValue)?.codePrefix ?? 'SAN';
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  existingItems.forEach((item) => {
    const m = String(item.code ?? '').match(pattern);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max + 1;
}
