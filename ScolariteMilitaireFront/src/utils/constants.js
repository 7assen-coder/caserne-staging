export const COLORS = {
  navy: '#1B2A4A',
  darkNavy: '#0F1B33',
  steel: '#3A4F6F',
  gold: '#C8A54E',
  goldLight: '#E8D5A0',
  red: '#C53030',
  green: '#276749',
  textLight: '#64748B',
  lightGray: '#E2E6EC',
};

export const FONCTIONS = {
  TERRAIN: 'terrain',
  ENCADREMENT: 'encadrement',
  COMMANDEMENT: 'commandement',
};

export const FONCTION_LABEL = {
  [FONCTIONS.TERRAIN]: 'Superviseur Militaire — Terrain',
  [FONCTIONS.ENCADREMENT]: 'Superviseur Militaire — Encadrement',
  [FONCTIONS.COMMANDEMENT]: 'Superviseur Militaire — Commandement',
};

/** Options rôle à la création utilisateur (Terrain, Encadrement, Commandement). */
export const FONCTION_ROLE_OPTIONS = [
  { value: FONCTIONS.TERRAIN, label: 'Terrain' },
  { value: FONCTIONS.ENCADREMENT, label: 'Encadrement' },
  { value: FONCTIONS.COMMANDEMENT, label: 'Commandement' },
];

export const STATUT_PRESENCE = {
  PRESENT: 'present',
  ABSENT: 'absent',
  PERMISSION: 'permission',
  MISSION: 'mission',
  MEDICAL: 'medical',
};

export const STATUT_LABEL = {
  present: 'Présent',
  absent: 'Absent',
  permission: 'En permission',
  mission: 'En mission',
  medical: 'Médical',
  justifie: 'Justifié',
  non_justifie: 'Non justifié',
  en_attente: 'En attente',
  valide: 'Validé',
  refuse: 'Refusé',
};

export const TYPES_RASSEMBLEMENT = [
  { value: 'matin', label: 'Rassemblement matin' },
  { value: 'apres_midi', label: 'Rassemblement après-midi' },
  { value: 'exceptionnel', label: 'Rassemblement exceptionnel' },
];

export const MOTIFS_ABSENCE = [
  { value: 'medical', label: 'Médical' },
  { value: 'social', label: 'Social' },
  { value: 'familial', label: 'Familial' },
  { value: 'administratif', label: 'Administratif' },
  { value: 'permission', label: 'Permission' },
  { value: 'mission', label: 'Mission' },
  { value: 'non_justifie', label: 'Non justifié' },
];

export const TYPES_ABSENCE = [
  { value: 'cours', label: 'Cours' },
  { value: 'instruction', label: 'Instruction militaire' },
  { value: 'activite', label: 'Activité' },
];

export const COMPAGNIES = ['1re Compagnie', '2e Compagnie'];
export const SECTIONS = ['Section 1', 'Section 2', 'Section 3', 'Section 4'];
export const PROMOTIONS = ['Promotion 2022', 'Promotion 2023', 'Promotion 2024', 'Promotion 2025'];

/* Départements : valeurs `value` = codes API Django (CHOIX_DEPARTEMENT). */
export const DEPARTEMENTS = [
  { value: 'GM', label: 'GM — Génie mécanique' },
  { value: 'IRT', label: 'IRT — Informatique, réseaux et télécommunications' },
  { value: 'GC-HE', label: 'GC-HE — Génie civil' },
  { value: 'GE', label: 'GE — Génie électrique' },
  { value: 'SID', label: 'SID — Statistique ingénierie des données' },
  { value: 'MPG', label: 'MPG — Mine, pétrole et gaz' },
];

export const FILIERES = DEPARTEMENTS.map((d) => d.label);

/** Normalise libellés / anciens codes (`GC`, `GH-GC`) vers la valeur API canonique. */
export function normalizeDepartementForApi(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return DEPARTEMENTS[0].value;
  const byValue = DEPARTEMENTS.find((d) => d.value === s);
  if (byValue) return byValue.value;
  const byLabel = DEPARTEMENTS.find((d) => d.label === s);
  if (byLabel) return byLabel.value;
  const u = s.toUpperCase();
  if (u === 'GC' || u === 'GH-GC') return 'GC-HE';
  return DEPARTEMENTS[0].value;
}

export const NIVEAUX_SCOLARITE = ['3e année', '4e année', '5e année', '4e DD', '5e E', '5e DD'];

/** Valeurs alignées avec `Eleve.CHOIX_VOIE_ACCES` côté Django (`'1'` … `'4'`). */
export const VOIES_ACCES_ETUDIANT = [
  { value: '1', label: 'Voie 1 — Interne' },
  { value: '2', label: 'Voie 1 — Externe' },
  { value: '3', label: 'Voie 2 — Interne' },
  { value: '4', label: 'Voie 2 — Externe' },
];
