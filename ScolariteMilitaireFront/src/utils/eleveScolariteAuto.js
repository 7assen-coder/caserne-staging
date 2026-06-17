/** Niveaux scolaires (formulaire création / édition). */
export const NIVEAUX_FORM_OPTIONS = [
  { value: '3e année', label: '3e année' },
  { value: '4e année', label: '4e année' },
  { value: '5e année', label: '5e année' },
  { value: '4e DD', label: '4e DD' },
  { value: '5e E', label: '5e E' },
  { value: '5e DD', label: '5e DD' },
];

export const NIVEAUX_FORM_VALUES = NIVEAUX_FORM_OPTIONS.map((o) => o.value);

export const STATUT_ACADEMIQUE_VALUES = ['normal', 'normal-mnv', 'repeat', 'excluded', 'graduated'];

export const STATUT_ACADEMIQUE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'normal-mnv', label: 'Normal-MNV' },
  { value: 'repeat', label: 'Redoublement' },
  { value: 'excluded', label: 'Exclu' },
  { value: 'graduated', label: 'Diplômé' },
];

const DEPT_GROUP = {
  IRT: 'A',
  SID: 'A',
  GM: 'B',
  GE: 'B',
  'GC-HE': 'C',
  GC: 'C',
  MPG: 'C',
};

const SECTION_BY_GROUP_YEAR = {
  A: { 3: 'Section 11', 4: 'Section 21', 5: 'Section 31' },
  B: { 3: 'Section 12', 4: 'Section 22', 5: 'Section 32' },
  C: { 3: 'Section 13', 4: 'Section 23', 5: 'Section 33' },
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

/** Cycle 3 / 4 / 5 à partir du libellé de niveau. */
export function anneeCycleFromNiveau(niveau) {
  const n = String(niveau || '').trim().toLowerCase();
  if (n.startsWith('3')) return 3;
  if (n.startsWith('4')) return 4;
  if (n.startsWith('5')) return 5;
  return null;
}

/** Compagnie automatique selon le niveau. */
export function compagnieDepuisNiveau(niveau) {
  const cycle = anneeCycleFromNiveau(niveau);
  if (cycle === 3) return '1re Compagnie';
  if (cycle === 4) return '2e Compagnie';
  if (cycle === 5) return '3e Compagnie';
  return '';
}

/** Section automatique selon département + niveau. */
export function sectionDepuisDepartementEtNiveau(departement, niveau) {
  const code = String(departement || '').trim().toUpperCase();
  const group = DEPT_GROUP[code];
  const cycle = anneeCycleFromNiveau(niveau);
  if (!group || !cycle) return '';
  return SECTION_BY_GROUP_YEAR[group][cycle] || '';
}

/** Afficher l’étape mobilité (5e année, 5e E, 5e DD, 4e DD…). */
export function isNiveauMobiliteEligible(niveau) {
  const n = String(niveau || '').trim().toLowerCase();
  if (n.startsWith('5')) return true;
  if (n === '4e dd') return true;
  return false;
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
