import { buildSanctionCode } from '../data/sanctionCatalog';

const STORAGE_KEY = 'esp_sanctions_v1';
export const SANCTIONS_CHANGED = 'esp-sanctions-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SANCTIONS_CHANGED));
  }
}

export function loadSanctions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSanctions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notifyChanged();
}

export function getSanctionsByEleveId(eleveId) {
  const key = String(eleveId ?? '');
  if (!key) return [];
  return loadSanctions()
    .filter((item) => String(item.eleveId) === key)
    .sort((a, b) => String(b.dateDebut ?? '').localeCompare(String(a.dateDebut ?? '')));
}

export function countSanctionsByEleveId(eleveId) {
  return getSanctionsByEleveId(eleveId).length;
}

export function getLastSanctionByEleveId(eleveId) {
  const items = getSanctionsByEleveId(eleveId);
  return items[0] ?? null;
}

export function findSanctionById(id) {
  return loadSanctions().find((item) => String(item.id) === String(id)) ?? null;
}

function newId() {
  return `san-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addSanction(payload) {
  const existing = getSanctionsByEleveId(payload.eleveId);
  const code =
    payload.code?.trim()
    || buildSanctionCode(payload.nature, existing.length + 1);
  const item = {
    id: newId(),
    eleveId: String(payload.eleveId),
    code,
    motif: payload.motif ?? '',
    nature: payload.nature ?? 'avertissement',
    dateDebut: payload.dateDebut ?? new Date().toISOString().slice(0, 10),
    dateFin: payload.dateFin ?? null,
    statut: payload.statut === 'cloturee' || payload.statut === 'annulee'
      ? payload.statut
      : 'en_cours',
    crPdf: payload.crPdf ?? null,
    pjPdf: payload.pjPdf ?? null,
  };
  const next = [...loadSanctions(), item];
  saveSanctions(next);
  return item;
}

export function updateSanction(id, patch) {
  const list = loadSanctions();
  const idx = list.findIndex((item) => String(item.id) === String(id));
  if (idx < 0) return null;
  const updated = {
    ...list[idx],
    ...patch,
    id: list[idx].id,
    eleveId: list[idx].eleveId,
  };
  list[idx] = updated;
  saveSanctions(list);
  return updated;
}

export function deleteSanction(id) {
  const list = loadSanctions();
  const next = list.filter((item) => String(item.id) !== String(id));
  if (next.length === list.length) return false;
  saveSanctions(next);
  return true;
}
