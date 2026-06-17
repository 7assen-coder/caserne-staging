const FLOW_KEY = 'esp-nouvel-etudiant-flow';
const DRAFT_KEY = 'esp-nouvel-etudiant-draft';

function readJson(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function loadNouvelEtudiantFlow() {
  const data = readJson(FLOW_KEY);
  if (!data || typeof data !== 'object') return null;
  return {
    eleveId: data.eleveId ?? null,
    dossierAcademiqueId: data.dossierAcademiqueId ?? null,
    documentsId: data.documentsId ?? null,
    contactsParentsId: data.contactsParentsId ?? null,
    dossierSanteId: data.dossierSanteId ?? null,
    dossierMilitaireId: data.dossierMilitaireId ?? null,
    hebergementId: data.hebergementId ?? null,
  };
}

export function saveNouvelEtudiantFlow(flow) {
  writeJson(FLOW_KEY, flow);
}

export function clearNouvelEtudiantPersistence() {
  try {
    sessionStorage.removeItem(FLOW_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Exclut les fichiers (non sérialisables) tout en conservant le reste du formulaire. */
function stripFiles(value) {
  if (value instanceof File) return null;
  if (Array.isArray(value)) return value.map(stripFiles);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = stripFiles(v);
    }
    return out;
  }
  return value;
}

export function loadNouvelEtudiantDraft() {
  const data = readJson(DRAFT_KEY);
  if (!data || typeof data !== 'object') return null;
  return {
    step: Number.isFinite(data.step) ? data.step : 0,
    values: data.values && typeof data.values === 'object' ? data.values : null,
    savedAt: data.savedAt ?? null,
  };
}

export function saveNouvelEtudiantDraft({ step, values }) {
  writeJson(DRAFT_KEY, {
    step,
    values: stripFiles(values),
    savedAt: Date.now(),
  });
}
