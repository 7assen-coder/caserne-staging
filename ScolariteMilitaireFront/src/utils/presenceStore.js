export const PRESENCE_CHANGED = 'esp-presence-changed';

export function loadAppels() {
  return [];
}

export function listAppels() {
  return [];
}

export function getAppel() {
  return null;
}

export function addAppel() {
  throw new Error('presenceStore: use presenceService (API).');
}

export function computePresenceTrend() {
  return [];
}

export function computePresenceParSection() {
  return [];
}

export function computeTopAbsences() {
  return [];
}
