export const SERIE_BAC_VALUES = ['C', 'D', 'TMGM', 'TSGM', 'Etrangere'];

export const SERIE_BAC_OPTIONS = [
  { value: '', label: '— Sélectionner —' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'TMGM', label: 'TMGM (Technique mathématique génie mécanique)' },
  { value: 'TSGM', label: 'TSGM (Technique sciences génie mécanique)' },
  { value: 'Etrangere', label: 'Étrangère' },
];

export const VOIES_ACCES_OPTIONS = [
  { value: '', label: '— Sélectionner —' },
  { value: '1', label: 'Voie 1 — Interne' },
  { value: '2', label: 'Voie 1 — Externe' },
  { value: '3', label: 'Voie 2 — Interne' },
  { value: '4', label: 'Voie 2 — Externe' },
];

export const DIPLOMES_ACCES_OPTIONS = [
  { value: '', label: '— Sélectionner —' },
  { value: 'CNIM', label: 'CNIM' },
  { value: 'Licence', label: 'Licence' },
  { value: 'Prépa étrangère', label: 'Prépa étrangère' },
];

export const GROUPES_SANGUINS_OPTIONS = [
  { value: '', label: '— Sélectionner —' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O−' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A−' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B−' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB−' },
];

export const STATUT_ETUDIANT_VALUES = ['normal', 'normal-mnv', 'repeat', 'excluded', 'graduated'];

export const STATUT_ETUDIANT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'normal-mnv', label: 'Normal-MNV' },
  { value: 'repeat', label: 'Redoublement' },
  { value: 'excluded', label: 'Exclu' },
  { value: 'graduated', label: 'Diplômé' },
];

export const NIVEAUX_STANDARD = ['3e année', '4e année', '5e année', '4e DD', '5e E', '5e DD'];

export const NIVEAUX_MOBILITE = ['4e DD', '5e année', '5e E', '5e DD'];

export const COMPAGNIES_OPTIONS = [
  { value: '', label: '— Automatique —' },
  { value: '1re Compagnie', label: '1re Compagnie (3e année)' },
  { value: '2e Compagnie', label: '2e Compagnie (4e année)' },
  { value: '3e Compagnie', label: '3e Compagnie (5e année)' },
];

export const SECTIONS_OPTIONS = [
  { value: '', label: '— Automatique —' },
  { value: 'Section 11', label: 'Section 11 (IRT/SID · 3e)' },
  { value: 'Section 12', label: 'Section 12 (GM/GE · 3e)' },
  { value: 'Section 13', label: 'Section 13 (GC/MPG · 3e)' },
  { value: 'Section 21', label: 'Section 21 (IRT/SID · 4e)' },
  { value: 'Section 22', label: 'Section 22 (GM/GE · 4e)' },
  { value: 'Section 23', label: 'Section 23 (GC/MPG · 4e)' },
  { value: 'Section 31', label: 'Section 31 (IRT/SID · 5e)' },
  { value: 'Section 32', label: 'Section 32 (GM/GE · 5e)' },
  { value: 'Section 33', label: 'Section 33 (GC/MPG · 5e)' },
];

export const COMPAGNIE_PAR_NIVEAU = {
  '3e année': '1re Compagnie',
  '4e année': '2e Compagnie',
  '4e DD': '2e Compagnie',
  '5e année': '3e Compagnie',
  '5e E': '3e Compagnie',
  '5e DD': '3e Compagnie',
};

export function compagnieAttendueDepuisNiveau(niveau) {
  return COMPAGNIE_PAR_NIVEAU[niveau] || '';
}

export const PARCOURS_MOBILITE_OPTIONS = [
  { value: '', label: '— Sélectionner —' },
  { value: 'Double diplôme', label: 'Double diplôme' },
  { value: 'Semestre d’échange', label: 'Semestre d’échange' },
];

export const RAISONS_DOUBLE_DIPLOME = [
  { value: '', label: '— Sélectionner —' },
  { value: 'Convention bilatérale', label: 'Convention bilatérale entre établissements' },
  { value: 'Bourse internationale', label: 'Bourse internationale (CAMES, AUF, Erasmus+, etc.)' },
  { value: 'Spécialisation indisponible', label: 'Spécialisation indisponible à l’ESP' },
  { value: 'Excellence académique', label: 'Excellence académique (top de promotion)' },
  { value: 'Partenariat industriel', label: 'Partenariat industriel / projet de recherche' },
];

export const RAISONS_ECHANGE = [
  { value: '', label: '— Sélectionner —' },
  { value: 'Programme Erasmus+', label: 'Programme Erasmus+' },
  { value: 'Accord interuniversitaire', label: 'Accord interuniversitaire' },
  { value: 'Mobilité encadrée', label: 'Mobilité encadrée (1 semestre)' },
  { value: 'Renforcement linguistique', label: 'Renforcement linguistique' },
  { value: 'Stage de recherche', label: 'Stage de recherche à l’étranger' },
];

export const ROLE_CREATEUR_OPTIONS = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'superviseur', label: 'Superviseur' },
  { value: 'commandant', label: 'Commandant de compagnie' },
  { value: 'chef-section', label: 'Chef de section' },
  { value: 'etudiant', label: 'Étudiant (auto-saisie)' },
];

export const ROLE_CREATEUR_LABEL = Object.fromEntries(
  ROLE_CREATEUR_OPTIONS.map((r) => [r.value, r.label]),
);

export const ROLE_STEPS_VISIBLES = {
  superadmin: ['etat-civil', 'scolarite', 'pieces', 'contacts', 'sante', 'militaire', 'hebergement'],
  superviseur: ['etat-civil', 'scolarite', 'pieces', 'contacts', 'sante', 'militaire', 'hebergement'],
  commandant: ['etat-civil', 'militaire', 'hebergement'],
  'chef-section': ['etat-civil', 'militaire', 'hebergement'],
  etudiant: ['etat-civil', 'pieces', 'contacts', 'sante'],
};
