/** Colonnes semestres / parcours du suivi scolarité (clés uniques). */
export const SEMESTRE_COLUMNS = [
  { key: 'S1', label: 'S1' },
  { key: 'S2', label: 'S2' },
  { key: 'S3', label: 'S3' },
  { key: 'S4', label: 'S4' },
  { key: 'S5', label: 'S5' },
  { key: 'S6', label: 'S6' },
  { key: 'S3DD', label: 'S3DD' },
  { key: 'S4DD', label: 'S4DD' },
  { key: 'S5M', label: 'S5' },
  { key: 'S5E', label: 'S5E' },
  { key: 'S5DD', label: 'S5DD' },
];

/** @deprecated Utiliser SEMESTRE_COLUMNS — clés uniques pour React / stockage */
export const SEMESTRE_KEYS = SEMESTRE_COLUMNS.map((c) => c.key);

export function semestreColumnLabel(key) {
  return SEMESTRE_COLUMNS.find((c) => c.key === key)?.label ?? key;
}

export const VALIDATION_SEMESTRE_VALUES = ['integral', 'partial', 'none'];

export const VALIDATION_SEMESTRE_OPTIONS = [
  { value: '', label: '— Non renseigné' },
  { value: 'integral', label: 'Validé intégralement' },
  { value: 'partial', label: 'Validé partiellement' },
  { value: 'none', label: 'Non validé' },
];

const VALIDATION_META = {
  integral: {
    label: 'Validé intégralement',
    short: 'VI',
    tone: 'green',
  },
  partial: {
    label: 'Validé partiellement',
    short: 'VP',
    tone: 'amber',
  },
  none: {
    label: 'Non validé',
    short: 'NV',
    tone: 'red',
  },
};

export function validationSemestreLabel(value) {
  if (!value) return '—';
  return VALIDATION_META[value]?.label ?? value;
}

export function validationSemestreShort(value) {
  if (!value) return '—';
  return VALIDATION_META[value]?.short ?? '—';
}

export function validationSemestreTone(value) {
  if (!value) return 'muted';
  return VALIDATION_META[value]?.tone ?? 'muted';
}

/** Semestres mobilité / DD pertinents selon le niveau. */
export function semestresMobiliteForNiveau(niveau) {
  const n = String(niveau ?? '').trim().toLowerCase();
  if (n === '4e dd') return ['S3DD', 'S4DD'];
  if (n === '5e dd') return ['S4DD', 'S5DD'];
  if (n === '5e e') return ['S5E'];
  if (n.startsWith('5')) return ['S5M'];
  return [];
}

export const DEFAULT_VISIBLE_SEMESTRE_COLS = [...SEMESTRE_KEYS];
