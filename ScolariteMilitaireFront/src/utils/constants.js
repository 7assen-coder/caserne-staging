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

export const COMPAGNIES = ['Compagnie Alpha', 'Compagnie Bravo', 'Compagnie Charlie'];
export const SECTIONS = [
  'Section 1A',
  'Section 1B',
  'Section 2A',
  'Section 2B',
  'Section 3A',
  'Section 3B',
];
export const PROMOTIONS = ['Promotion 2022', 'Promotion 2023', 'Promotion 2024', 'Promotion 2025'];

/** Départements SI (6 filières officielles) */
export const DEPARTEMENTS = [
  { code: 'GM', label: 'GM — Génie mécanique' },
  { code: 'IRT', label: 'IRT — Informatique, réseaux et télécommunications' },
  { code: 'GC', label: 'GC — Génie civil' },
  { code: 'GE', label: 'GE — Génie électrique' },
  { code: 'SID', label: 'SID — Statistique ingénierie des données' },
  { code: 'MPG', label: 'MPG — Mine, pétrole et gaz' },
];

/** Libellés pour filtres, listes et dossier étudiant */
export const FILIERES = DEPARTEMENTS.map((d) => d.label);

/** Niveaux d’études (ordre affiché dans le formulaire élève) */
export const NIVEAUX_SCOLARITE = ['3e année', '4e année', '5e E', '5e DD', '6e E', '6e DD'];

/** Voies d’accès (SI) — options imposées */
export const VOIES_ACCES_ETUDIANT = [
  { value: 'Voix 1', label: 'Voix 1' },
  { value: 'Voix 2', label: 'Voix 2' },
];
