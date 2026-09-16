import { isFrontendOnly } from './frontendMode';
import { assertApiSourceOfTruth } from './opsApi';

export const IMPORTED_ELEVES_CHANGED = 'esp-imported-eleves-changed';

const KEY = 'esp_imported_eleves_v1';

function notify() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(IMPORTED_ELEVES_CHANGED));
  }
}

/** Only used when VITE_FRONTEND_ONLY=true. */
export function loadImportedEleves() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listImportedEleves() {
  return loadImportedEleves();
}

export function findImportedById(id) {
  return loadImportedEleves().find((e) => String(e.id) === String(id)) ?? null;
}

export function findImportedByMatricule(matricule) {
  const m = String(matricule ?? '').trim().toLowerCase();
  return loadImportedEleves().find((e) => String(e.matricule ?? '').toLowerCase() === m) ?? null;
}

export function appendImportedEleves(newEleves) {
  assertApiSourceOfTruth('importedElevesStore');
  const list = [...loadImportedEleves(), ...(newEleves ?? [])];
  localStorage.setItem(KEY, JSON.stringify(list));
  notify();
  return newEleves?.length ?? 0;
}

export function removeImportedById(id) {
  if (!isFrontendOnly()) return false;
  const next = loadImportedEleves().filter((e) => String(e.id) !== String(id));
  localStorage.setItem(KEY, JSON.stringify(next));
  notify();
  return true;
}
