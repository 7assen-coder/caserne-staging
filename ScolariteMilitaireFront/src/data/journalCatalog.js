/** Catalogue des entrées du journal de vie scolaire — frontend-only. */

export const JOURNAL_TYPES = [
  { value: 'observation', label: 'Observation', codePrefix: 'OBS' },
  { value: 'felicitation', label: 'Félicitation', codePrefix: 'FEL' },
  { value: 'incident', label: 'Incident', codePrefix: 'INC' },
  { value: 'consigne', label: 'Consigne', codePrefix: 'CSG' },
  { value: 'encadrement', label: 'Entretien encadrement', codePrefix: 'ENC' },
  { value: 'divers', label: 'Divers', codePrefix: 'JRN' },
];

export function journalTypeLabel(value) {
  return JOURNAL_TYPES.find((t) => t.value === value)?.label ?? value ?? '—';
}

export function buildJournalCode(typeValue, seq = 1) {
  const type = JOURNAL_TYPES.find((t) => t.value === typeValue);
  const prefix = type?.codePrefix ?? 'JRN';
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

export function nextJournalSeq(existingItems = [], typeValue) {
  const prefix = JOURNAL_TYPES.find((t) => t.value === typeValue)?.codePrefix ?? 'JRN';
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  existingItems.forEach((item) => {
    const m = String(item.code ?? '').match(pattern);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max + 1;
}
