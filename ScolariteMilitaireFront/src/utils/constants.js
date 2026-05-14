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

export const COMPAGNIES = ['1ʳᵉ Compagnie', '2ᵉ Compagnie'];
export const SECTIONS = ['Section 1', 'Section 2', 'Section 3', 'Section 4'];
export const PROMOTIONS = ['Promotion 2022', 'Promotion 2023', 'Promotion 2024', 'Promotion 2025'];

export const DEPARTEMENTS = [
  { code: 'GM', label: 'GM — Génie mécanique' },
  { code: 'IRT', label: 'IRT — Informatique, réseaux et télécommunications' },
  { code: 'GC', label: 'GC — Génie civil' },
  { code: 'GE', label: 'GE — Génie électrique' },
  { code: 'SID', label: 'SID — Statistique ingénierie des données' },
  { code: 'MPG', label: 'MPG — Mine, pétrole et gaz' },
];

export const FILIERES = DEPARTEMENTS.map((d) => d.label);

export const NIVEAUX_SCOLARITE = ['3e année', '4e année', '5e E', '5e DD'];

export const VOIES_ACCES_ETUDIANT = [
  { value: 'Voie 1 — Interne', label: 'Voie 1 — Interne' },
  { value: 'Voie 1 — Externe', label: 'Voie 1 — Externe' },
  { value: 'Voie 2 — Interne', label: 'Voie 2 — Interne' },
  { value: 'Voie 2 — Externe', label: 'Voie 2 — Externe' },
];
