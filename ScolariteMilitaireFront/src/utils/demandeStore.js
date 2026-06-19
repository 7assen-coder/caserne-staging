const STORAGE_KEY = 'esp_demandes_v1';
export const DEMANDES_CHANGED = 'esp-demandes-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEMANDES_CHANGED));
  }
}

export function loadDemandes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDemandes(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notifyChanged();
}

export function getDemandesByEleveId(eleveId) {
  const key = String(eleveId ?? '');
  if (!key) return [];
  return loadDemandes()
    .filter((item) => String(item.eleveId) === key)
    .sort((a, b) => String(b.dateDepot ?? '').localeCompare(String(a.dateDepot ?? '')));
}

export function countDemandesByEleveId(eleveId) {
  return getDemandesByEleveId(eleveId).length;
}

export function getLastDemandeByEleveId(eleveId) {
  return getDemandesByEleveId(eleveId)[0] ?? null;
}

export function findDemandeById(id) {
  return loadDemandes().find((item) => String(item.id) === String(id)) ?? null;
}

function newId() {
  return `dem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addDemande(payload) {
  const item = {
    id: newId(),
    eleveId: String(payload.eleveId),
    code: payload.code ?? '',
    description: payload.description ?? '',
    nature: payload.nature ?? 'divers',
    dateDepot: payload.dateDepot ?? new Date().toISOString().slice(0, 10),
    statut: ['acceptee', 'refusee', 'annulee'].includes(payload.statut)
      ? payload.statut
      : 'en_cours',
    demandePdf: payload.demandePdf ?? null,
    pjPdf: payload.pjPdf ?? null,
  };
  saveDemandes([...loadDemandes(), item]);
  return item;
}

export function updateDemande(id, patch) {
  const list = loadDemandes();
  const idx = list.findIndex((item) => String(item.id) === String(id));
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch, id: list[idx].id, eleveId: list[idx].eleveId };
  list[idx] = updated;
  saveDemandes(list);
  return updated;
}

export function deleteDemande(id) {
  const list = loadDemandes();
  const next = list.filter((item) => String(item.id) !== String(id));
  if (next.length === list.length) return false;
  saveDemandes(next);
  return true;
}
