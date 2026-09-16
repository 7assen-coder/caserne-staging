export const DROITS_CHANGED = 'esp-droits-changed';

export function getBatchMeta() {
  return { validatedAt: null, defaultMontant: 0 };
}

export function getLignesForBatch() {
  return [];
}

export function upsertManyLignes() {
  throw new Error('droitsStore: use droitsService (API).');
}

export function validateBatch() {
  throw new Error('droitsStore: use droitsService (API).');
}

export function unlockBatch() {
  throw new Error('droitsStore: use droitsService (API).');
}

export function setBatchDefaultMontant() {
  throw new Error('droitsStore: use droitsService (API).');
}
