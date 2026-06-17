const STORAGE_KEY = 'esp_imported_eleves_v1';
export const IMPORTED_ELEVES_CHANGED = 'esp-imported-eleves-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(IMPORTED_ELEVES_CHANGED));
  }
}

export function loadImportedEleves() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveImportedEleves(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notifyChanged();
}

export function findImportedById(id) {
  return loadImportedEleves().find((e) => String(e.id) === String(id)) ?? null;
}

export function findImportedByMatricule(matricule) {
  const key = String(matricule ?? '').trim().toLowerCase();
  if (!key) return null;
  return loadImportedEleves().find((e) => String(e.matricule ?? '').trim().toLowerCase() === key) ?? null;
}

export function appendImportedEleves(newEleves) {
  const existing = loadImportedEleves();
  const seen = new Set(existing.map((e) => String(e.matricule ?? '').trim().toLowerCase()));
  const toAdd = [];
  for (const eleve of newEleves) {
    const matKey = String(eleve.matricule ?? '').trim().toLowerCase();
    if (!matKey || seen.has(matKey)) continue;
    seen.add(matKey);
    toAdd.push(eleve);
  }
  if (!toAdd.length) return 0;
  saveImportedEleves([...toAdd, ...existing]);
  return toAdd.length;
}

export function removeImportedById(id) {
  const next = loadImportedEleves().filter((e) => String(e.id) !== String(id));
  if (next.length === loadImportedEleves().length) return false;
  saveImportedEleves(next);
  return true;
}
