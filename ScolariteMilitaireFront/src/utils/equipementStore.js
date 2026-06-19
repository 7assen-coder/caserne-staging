import { EQUIPEMENT_CATALOG, buildEquipementCode } from '../data/equipementCatalog';

const STORAGE_KEY = 'esp_equipement_items_v1';
export const EQUIPEMENT_CHANGED = 'esp-equipement-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EQUIPEMENT_CHANGED));
  }
}

export function loadEquipementItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEquipementItems(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notifyChanged();
}

export function getItemsByEleveId(eleveId) {
  const key = String(eleveId ?? '');
  if (!key) return [];
  return loadEquipementItems().filter((item) => String(item.eleveId) === key);
}

export function countItemsByEleveId(eleveId) {
  return getItemsByEleveId(eleveId).length;
}

export function findEquipementItemById(id) {
  return loadEquipementItems().find((item) => String(item.id) === String(id)) ?? null;
}

function newId() {
  return `eq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addEquipementItem(payload) {
  const item = {
    id: newId(),
    eleveId: String(payload.eleveId),
    code: payload.code ?? '',
    type: payload.type ?? '',
    description: payload.description ?? '',
    quantite: Number(payload.quantite) || 1,
    dateRemise: payload.dateRemise ?? new Date().toISOString().slice(0, 10),
    etat: payload.etat === 'rendu' ? 'rendu' : 'en_usage',
    dateRetour: payload.dateRetour ?? null,
    pdfAttachment: payload.pdfAttachment ?? null,
  };
  const next = [...loadEquipementItems(), item];
  saveEquipementItems(next);
  return item;
}

export function updateEquipementItem(id, patch) {
  const list = loadEquipementItems();
  const idx = list.findIndex((item) => String(item.id) === String(id));
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch, id: list[idx].id, eleveId: list[idx].eleveId };
  list[idx] = updated;
  saveEquipementItems(list);
  return updated;
}

export function deleteEquipementItem(id) {
  const list = loadEquipementItems();
  const next = list.filter((item) => String(item.id) !== String(id));
  if (next.length === list.length) return false;
  saveEquipementItems(next);
  return true;
}

export function returnEquipementItem(id, dateRetour) {
  return updateEquipementItem(id, {
    etat: 'rendu',
    dateRetour: dateRetour ?? new Date().toISOString().slice(0, 10),
  });
}
