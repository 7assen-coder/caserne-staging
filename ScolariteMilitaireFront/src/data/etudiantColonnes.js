/** Registre central des colonnes liste / export étudiants (format dossier Excel). */

import { buildDossierColonnes } from './dossierExcelColumns';

export const COLONNE_GROUPES = {
  identite: 'Identité',
  bac: 'Bac',
  scolarite: 'Scolarité',
  contact: 'Contact',
  militaire: 'Vie militaire',
  mobilite: 'Mobilité',
  sante: 'Santé',
  hebergement: 'Hébergement',
  mensurations: 'Mensurations & habillement',
};

/** @type {import('./etudiantColonnes').EtudiantColonneDef[]} */
export const ETUDIANT_COLONNES = buildDossierColonnes();

export const COLONNES_BY_ID = Object.fromEntries(ETUDIANT_COLONNES.map((c) => [c.id, c]));

export const DEFAULT_VISIBLE_COLONNE_IDS = ETUDIANT_COLONNES.filter((c) => c.defaultVisible).map(
  (c) => c.id,
);

export const SIMPLE_EXPORT_COLONNE_IDS = ETUDIANT_COLONNES.filter((c) => c.simpleExport).map(
  (c) => c.id,
);

export const STORAGE_KEY_COLONNES = 'esp-etudiants-colonnes-visibles-v2';

export function sanitizeColonneIds(ids) {
  const valid = new Set(ETUDIANT_COLONNES.map((c) => c.id));
  const cleaned = (ids || []).filter((id) => valid.has(id));
  if (!cleaned.length) return [...DEFAULT_VISIBLE_COLONNE_IDS];
  if (!cleaned.includes('matricule')) cleaned.unshift('matricule');
  return cleaned;
}

export function loadVisibleColonneIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLONNES);
    if (!raw) return [...DEFAULT_VISIBLE_COLONNE_IDS];
    return sanitizeColonneIds(JSON.parse(raw));
  } catch {
    return [...DEFAULT_VISIBLE_COLONNE_IDS];
  }
}

export function saveVisibleColonneIds(ids) {
  localStorage.setItem(STORAGE_KEY_COLONNES, JSON.stringify(sanitizeColonneIds(ids)));
}

export function resolveColonnes(ids) {
  return sanitizeColonneIds(ids)
    .map((id) => COLONNES_BY_ID[id])
    .filter(Boolean);
}

/**
 * Matrice [en-têtes], [lignes…] pour export.
 * @param {'label'|'id'} headerMode — Excel re-import uses snake_case ids.
 */
export function buildExportMatrix(eleves, colonneIds, { headerMode = 'label' } = {}) {
  const cols = resolveColonnes(colonneIds);
  const headers = cols.map((c) => (headerMode === 'id' ? c.id : c.label));
  const rows = eleves.map((e) =>
    cols.map((c) => {
      const v = c.getValue(e);
      return v == null || v === '' ? '' : String(v);
    }),
  );
  return { headers, rows, cols };
}

/** Toutes les colonnes dossier sélectionnées (y compris mensurations). */
export function resolveColonnesExport(colonneIds) {
  return resolveColonnes(colonneIds);
}

/** @deprecated Prefer resolveColonnesExport — mensurations are part of the dossier template. */
export function resolveColonnesExportSansMensurations(colonneIds) {
  return resolveColonnesExport(colonneIds);
}

/**
 * Export transposé : libellés en colonne A, un étudiant par colonne (B, C…).
 * @returns {{ rowLabels: string[], studentHeaders: string[], grid: string[][] }}
 */
export function buildTransposedExportMatrix(eleves, colonneIds) {
  const cols = resolveColonnesExport(colonneIds);
  if (!cols.length) {
    return { rowLabels: [], studentHeaders: [], grid: [] };
  }

  const studentHeaders = eleves.map((e) => {
    const m = e.matricule ?? '';
    const n = `${e.prenom ?? ''} ${e.nom ?? ''}`.trim();
    return n ? `${n} (${m})` : String(m || 'Étudiant');
  });

  const rowLabels = cols.map((c) => c.label);
  const grid = cols.map((col) =>
    eleves.map((e) => {
      const v = col.getValue(e);
      return v == null || v === '' ? '' : String(v);
    }),
  );

  return { rowLabels, studentHeaders, grid, cols };
}
