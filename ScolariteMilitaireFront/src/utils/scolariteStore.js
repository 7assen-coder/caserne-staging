const STORAGE_KEY = 'esp_scolarite_suivi_v1';
export const SCOLARITE_CHANGED = 'esp-scolarite-changed';

const ETABLISSEMENTS_DEMO = [
  'École des Mines de Nancy',
  'INSA Lyon',
  'Université de Sherbrooke',
  'TU Munich',
  'École Polytechnique de Montréal',
];

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SCOLARITE_CHANGED));
  }
}

export function loadScolariteRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveScolariteRecords(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notifyChanged();
}

export function getScolariteByEleveId(eleveId) {
  return loadScolariteRecords().find((r) => String(r.eleveId) === String(eleveId)) ?? null;
}

export function upsertScolariteRecord(eleveId, patch) {
  const list = loadScolariteRecords();
  const idx = list.findIndex((r) => String(r.eleveId) === String(eleveId));
  const base = idx >= 0 ? list[idx] : { eleveId: String(eleveId), semestres: {}, mobilite: null };
  const updated = {
    ...base,
    ...patch,
    eleveId: String(eleveId),
    semestres: { ...base.semestres, ...(patch.semestres ?? {}) },
    mobilite: patch.mobilite !== undefined ? patch.mobilite : base.mobilite,
  };
  if (idx >= 0) list[idx] = updated;
  else list.push(updated);
  saveScolariteRecords(list);
  return updated;
}

export function updateSemestreValidation(eleveId, semestreKey, value) {
  const record = getScolariteByEleveId(eleveId);
  const semestres = { ...(record?.semestres ?? {}), [semestreKey]: value || undefined };
  if (!value) delete semestres[semestreKey];
  return upsertScolariteRecord(eleveId, { semestres });
}

export function updateMobiliteScolarite(eleveId, mobilite) {
  return upsertScolariteRecord(eleveId, { mobilite });
}
