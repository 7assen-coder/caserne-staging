/** Catalogue suivi médical — frontend-only. */

export const CONSULTATION_TYPES = [
  { value: 'consultation', label: 'Consultation', codePrefix: 'CON' },
  { value: 'incident', label: 'Incident médical', codePrefix: 'INC' },
];

export function consultationTypeLabel(value) {
  return CONSULTATION_TYPES.find((t) => t.value === value)?.label ?? value ?? '—';
}

export function buildConsultationCode(typeValue, seq = 1) {
  const type = CONSULTATION_TYPES.find((t) => t.value === typeValue);
  const prefix = type?.codePrefix ?? 'MED';
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

export function nextConsultationSeq(existingItems = [], typeValue) {
  const prefix = CONSULTATION_TYPES.find((t) => t.value === typeValue)?.codePrefix ?? 'MED';
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  existingItems.forEach((item) => {
    const m = String(item.code ?? '').match(pattern);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max + 1;
}
