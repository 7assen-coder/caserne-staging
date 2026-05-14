import {
  getParcoursAnneeFormations,
  departementCodeDepuisFiliere,
} from './espFormationCatalog';

export function getAnneeEntiereIrt(annee, filiereLabel) {
  const dept = filiereLabel ? departementCodeDepuisFiliere(filiereLabel) : 'irt';
  return getParcoursAnneeFormations(dept, annee);
}

export function getModulesIrt(annee, semestre, filiereLabel) {
  const p = getAnneeEntiereIrt(annee, filiereLabel);
  return semestre === 'S2' ? p.S2 : p.S1;
}

export function anneeDepuisCycle(cycleLabel) {
  if (!cycleLabel) return 2;
  const s = String(cycleLabel).toLowerCase();
  if (s.includes('3e') || s.includes('3è')) return 3;
  if (s.includes('1e') || s.includes('1re') || s.includes('1ère')) return 1;
  if (s.includes('2e') || s.includes('2è')) return 2;
  if (s.includes('préparatoire') || s.includes('preparatoire')) return 1;
  return 2;
}

export const ANNEE_OPTIONS = [
  { value: 1, label: '1re année' },
  { value: 2, label: '2e année' },
  { value: 3, label: '3e année' },
];
