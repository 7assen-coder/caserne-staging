export const SANCTIONS_CHANGED = 'esp-sanctions-changed';

export function loadSanctions() {
  return [];
}

export function getSanctionsByEleveId() {
  return [];
}

export function countSanctionsByEleveId() {
  return 0;
}

export function getLastSanctionByEleveId() {
  return null;
}

export function findSanctionById() {
  return null;
}

export function addSanction() {
  throw new Error('sanctionStore: use sanctionService (API).');
}

export function updateSanction() {
  throw new Error('sanctionStore: use sanctionService (API).');
}

export function deleteSanction() {
  throw new Error('sanctionStore: use sanctionService (API).');
}
