/**
 * Parcours & modules — calés sur l’offre « Formation » ESP.
 * Remplace le « programme-type » artificiel par des données de référence (IRT S1 = site) ; autres dpts : `formation/{code}`.
 * @see https://www.esp.mr/formation/irt
 */

import {
  getParcoursAnneeFormations,
  departementCodeDepuisFiliere,
} from './espFormationCatalog';

/**
 * @param {1|2|3} annee
 * @param {string} [filiereLabel] ex. "IRT — …" / "GC — …" pour `esp.mr/formation/gc`
 */
export function getAnneeEntiereIrt(annee, filiereLabel) {
  const dept = filiereLabel ? departementCodeDepuisFiliere(filiereLabel) : 'irt';
  return getParcoursAnneeFormations(dept, annee);
}

/**
 * @param {1|2|3} annee
 * @param {'S1'|'S2'} semestre
 * @param {string} [filiereLabel]
 */
export function getModulesIrt(annee, semestre, filiereLabel) {
  const p = getAnneeEntiereIrt(annee, filiereLabel);
  return semestre === 'S2' ? p.S2 : p.S1;
}

/**
 * @param {string} cycleLabel
 * @returns {1|2|3}
 */
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
