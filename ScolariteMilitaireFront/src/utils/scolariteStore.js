/** UI prefs / events only — operational writes go through API services. */
export const SCOLARITE_CHANGED = 'esp-scolarite-changed';

export function loadScolariteRecords() {
  return [];
}

export function getScolariteByEleveId() {
  return null;
}

export function upsertScolariteRecord() {
  throw new Error('scolariteStore: use scolariteService (API).');
}

export function updateSemestreValidation() {
  throw new Error('scolariteStore: use scolariteService (API).');
}

export function updateMobiliteScolarite() {
  throw new Error('scolariteStore: use scolariteService (API).');
}
