const CONSULTATIONS_KEY = 'esp_medical_consultations_v1';
const PROFILES_KEY = 'esp_medical_profiles_v1';
export const MEDICAL_CHANGED = 'esp-medical-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MEDICAL_CHANGED));
  }
}

function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return key === PROFILES_KEY ? {} : [];
    const parsed = JSON.parse(raw);
    if (key === PROFILES_KEY) return parsed && typeof parsed === 'object' ? parsed : {};
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return key === PROFILES_KEY ? {} : [];
  }
}

function saveConsultations(list) {
  localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(list));
  notifyChanged();
}

function saveProfiles(map) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(map));
  notifyChanged();
}

export function loadConsultations() {
  return loadJson(CONSULTATIONS_KEY);
}

export function loadMedicalProfiles() {
  return loadJson(PROFILES_KEY);
}

export function getConsultationsByEleveId(eleveId) {
  const key = String(eleveId ?? '');
  if (!key) return [];
  return loadConsultations()
    .filter((item) => String(item.eleveId) === key)
    .sort((a, b) => String(b.dateConsultation ?? '').localeCompare(String(a.dateConsultation ?? '')));
}

export function countConsultationsByEleveId(eleveId) {
  return getConsultationsByEleveId(eleveId).length;
}

export function getLastConsultationByEleveId(eleveId) {
  return getConsultationsByEleveId(eleveId)[0] ?? null;
}

export function findConsultationById(id) {
  return loadConsultations().find((item) => String(item.id) === String(id)) ?? null;
}

export function getMedicalProfile(eleveId) {
  const key = String(eleveId ?? '');
  if (!key) return null;
  return loadMedicalProfiles()[key] ?? null;
}

export function mergeMedicalProfile(eleveId, sante = {}) {
  const stored = getMedicalProfile(eleveId);
  return {
    maladiesChroniques: stored?.maladiesChroniques ?? sante.maladiesChroniques ?? '',
    medicaments: stored?.medicaments ?? sante.medicaments ?? '',
    dossierMedicalPdf: stored?.dossierMedicalPdf ?? null,
    photoMedicale: stored?.photoMedicale ?? null,
  };
}

function newId() {
  return `med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertMedicalProfile(eleveId, patch) {
  const key = String(eleveId);
  const profiles = loadMedicalProfiles();
  profiles[key] = {
    ...(profiles[key] ?? {}),
    ...patch,
    eleveId: key,
    updatedAt: new Date().toISOString(),
  };
  saveProfiles(profiles);
  return profiles[key];
}

export function addConsultation(payload) {
  const item = {
    id: newId(),
    eleveId: String(payload.eleveId),
    code: payload.code ?? '',
    type: payload.type === 'incident' ? 'incident' : 'consultation',
    motif: payload.motif ?? '',
    dateConsultation: payload.dateConsultation ?? new Date().toISOString().slice(0, 10),
    avisInfirmerie: payload.avisInfirmerie ?? '',
    pjPdf: payload.pjPdf ?? null,
  };
  saveConsultations([...loadConsultations(), item]);
  return item;
}

export function updateConsultation(id, patch) {
  const list = loadConsultations();
  const idx = list.findIndex((item) => String(item.id) === String(id));
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch, id: list[idx].id, eleveId: list[idx].eleveId };
  list[idx] = updated;
  saveConsultations(list);
  return updated;
}

export function deleteConsultation(id) {
  const list = loadConsultations();
  const next = list.filter((item) => String(item.id) !== String(id));
  if (next.length === list.length) return false;
  saveConsultations(next);
  return true;
}
