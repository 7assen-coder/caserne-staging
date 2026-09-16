/** Niveaux scolaires (formulaire création / édition). */
export const NIVEAUX_FORM_OPTIONS = [
  { value: '3e année', label: '3e année' },
  { value: '4e année', label: '4e année' },
  { value: '4e DD', label: '4e DD' },
  { value: '5e E', label: '5e E' },
  { value: '5e DD', label: '5e DD' },
];

export const NIVEAUX_FORM_VALUES = NIVEAUX_FORM_OPTIONS.map((o) => o.value);

export const STATUT_ACADEMIQUE_VALUES = ['normal', 'normal-mnv', 'repeat', 'excluded', 'graduated'];

export const STATUT_ACADEMIQUE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'normal-mnv', label: 'Normal-MNV' },
  { value: 'repeat', label: 'Redoublant' },
  { value: 'excluded', label: 'Exclu' },
  { value: 'graduated', label: 'Diplômé' },
];

const DEPT_SECTION_DIGIT = {
  IRT: '1',
  SID: '1',
  GM: '2',
  GE: '2',
  'GC-HE': '3',
  GC: '3',
  MPG: '3',
};

export function statutAcademiqueToParcours(statut) {
  switch (statut) {
    case 'normal-mnv':
      return 'Normal-MNV';
    case 'repeat':
      return 'Redoublant';
    case 'excluded':
      return 'Exclu';
    case 'graduated':
      return 'Diplômé';
    case 'normal':
    default:
      return 'En cours normal';
  }
}

export function parcoursToStatutAcademique(parcours) {
  const v = String(parcours || '').toLowerCase();
  if (v.includes('mnv')) return 'normal-mnv';
  if (v.includes('redoubl')) return 'repeat';
  if (v.includes('exclu')) return 'excluded';
  if (v.includes('diplôm') || v.includes('diplom')) return 'graduated';
  if (v.includes('normal')) return 'normal';
  return 'normal';
}

/** Cycle 3 / 4 / 5 à partir du libellé ou code API de niveau. */
export function anneeCycleFromNiveau(niveau) {
  const raw = String(niveau || '').trim();
  if (!raw) return null;
  const n = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '');
  // 4-E / 5* → 3e Compagnie
  if (n === '4-E' || n === '4E' || n.startsWith('5')) return 5;
  if (n.startsWith('3')) return 3;
  if (n.startsWith('4')) return 4;
  return null;
}

/** Compagnie digit 1|2|3 from niveau. */
export function compagnieDigitFromNiveau(niveau) {
  const cycle = anneeCycleFromNiveau(niveau);
  if (cycle === 3) return '1';
  if (cycle === 4) return '2';
  if (cycle === 5) return '3';
  return '';
}

/** Compagnie automatique selon le niveau. */
export function compagnieDepuisNiveau(niveau) {
  const cycle = anneeCycleFromNiveau(niveau);
  if (cycle === 3) return '1re Compagnie';
  if (cycle === 4) return '2e Compagnie';
  if (cycle === 5) return '3e Compagnie';
  return '';
}

function deptSectionDigit(departement) {
  const code = String(departement || '').trim().toUpperCase();
  return DEPT_SECTION_DIGIT[code] || '';
}

/** Section compound: Section 11 / 12 / 21 … */
export function sectionDepuisDepartementEtNiveau(departement, niveau) {
  const cDigit = compagnieDigitFromNiveau(niveau);
  const dDigit = deptSectionDigit(departement);
  if (!cDigit || !dDigit) return '';
  return `Section ${cDigit}${dDigit}`;
}

/**
 * Digits from compagnie label → 1|2|3.
 * @param {string|null|undefined} compagnie
 */
export function compagnieDigitFromLabel(compagnie) {
  const s = String(compagnie ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s.startsWith('1') || s.includes('1re') || s.includes('1ère') || s.includes('1ere')) return '1';
  if (s.startsWith('2') || s.includes('2e') || s.includes('2ème') || s.includes('2eme')) return '2';
  if (s.startsWith('3') || s.includes('3e') || s.includes('3ème') || s.includes('3eme')) return '3';
  const d = s.replace(/\D/g, '');
  if (d[0] === '1' || d[0] === '2' || d[0] === '3') return d[0];
  return '';
}

/**
 * Preserve compound Section 11/21/31; expand short Section 1+compagnie → Section 11.
 * @param {string|number|null|undefined} raw
 * @param {string|null|undefined} [compagnie]
 */
export function normalizeSectionLabel(raw, compagnie) {
  const s = String(raw ?? '').trim();
  if (!s) return '';

  const labeled = /^Section\s*(\d{1,2})$/i.exec(s);
  if (labeled) {
    const digits = labeled[1];
    if (digits.length === 2) return `Section ${digits}`;
    // Single digit: expand with compagnie when known
    const cDigit = compagnieDigitFromLabel(compagnie);
    if (cDigit && /^[123]$/.test(digits)) return `Section ${cDigit}${digits}`;
    return `Section ${digits}`;
  }

  const onlyDigits = s.replace(/\D/g, '');
  if (onlyDigits.length === 2 && /^[123][123]$/.test(onlyDigits)) {
    return `Section ${onlyDigits}`;
  }
  if (onlyDigits.length === 1 && /^[123]$/.test(onlyDigits)) {
    const cDigit = compagnieDigitFromLabel(compagnie);
    if (cDigit) return `Section ${cDigit}${onlyDigits}`;
    return `Section ${onlyDigits}`;
  }
  return s;
}

/** Prefer compound section for display (list / fiche / PDF). */
export function formatSectionLabel(section, compagnie) {
  return normalizeSectionLabel(section, compagnie);
}

/** Afficher l’étape mobilité uniquement pour ces niveaux. */
export const NIVEAUX_MOBILITE_ELIGIBLE = ['4e DD', '5e E', '5e DD'];

export function isNiveauMobiliteEligible(niveau) {
  return NIVEAUX_MOBILITE_ELIGIBLE.includes(String(niveau || '').trim());
}

/** Type de mobilité imposé par le niveau (non modifiable dans le formulaire). */
export function mobiliteTypeFromNiveau(niveau) {
  const n = String(niveau || '').trim();
  if (n === '5e E') return 'Semestre d’échange';
  if (n === '4e DD' || n === '5e DD') return 'Double diplôme';
  return '';
}

export function applyAutoMilitaire(departement, niveau) {
  return {
    compagnie: compagnieDepuisNiveau(niveau),
    section: sectionDepuisDepartementEtNiveau(departement, niveau),
  };
}

export function normalizeStatutFormValue(statut) {
  const s = String(statut || '').trim().toLowerCase();
  if (STATUT_ACADEMIQUE_VALUES.includes(s)) return s;
  if (s === 'actif') return 'normal';
  if (s === 'redoublant') return 'repeat';
  if (s === 'suspendu') return 'excluded';
  return 'normal';
}

export function statutAcademiqueLabel(statut) {
  return STATUT_ACADEMIQUE_OPTIONS.find((o) => o.value === normalizeStatutFormValue(statut))?.label ?? statut;
}
