import { defaultMontantForCompagnie, buildDroitsBatchKey } from '../data/droitsCatalog';

const LIGNES_KEY = 'esp_droits_lignes_v1';
const BATCHES_KEY = 'esp_droits_batches_v1';
export const DROITS_CHANGED = 'esp-droits-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DROITS_CHANGED));
  }
}

function loadLignes() {
  try {
    const raw = localStorage.getItem(LIGNES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLignes(list) {
  localStorage.setItem(LIGNES_KEY, JSON.stringify(list));
  notifyChanged();
}

function loadBatches() {
  try {
    const raw = localStorage.getItem(BATCHES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveBatches(map) {
  localStorage.setItem(BATCHES_KEY, JSON.stringify(map));
  notifyChanged();
}

export function getBatchMeta(annee, mois, compagnie) {
  const key = buildDroitsBatchKey(annee, mois, compagnie);
  return loadBatches()[key] ?? { validatedAt: null, defaultMontant: defaultMontantForCompagnie(compagnie) };
}

export function getLignesForBatch(annee, mois, compagnie) {
  const a = Number(annee);
  const m = Number(mois);
  return loadLignes().filter(
    (l) => Number(l.annee) === a && Number(l.mois) === m && l.compagnie === compagnie,
  );
}

export function upsertLigne({ annee, mois, compagnie, eleveId, montant, etat, remarques }) {
  const list = loadLignes();
  const idx = list.findIndex(
    (l) =>
      Number(l.annee) === Number(annee)
      && Number(l.mois) === Number(mois)
      && l.compagnie === compagnie
      && String(l.eleveId) === String(eleveId),
  );
  const row = {
    id: idx >= 0 ? list[idx].id : `drt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    annee: Number(annee),
    mois: Number(mois),
    compagnie,
    eleveId: String(eleveId),
    montant: Number(montant) || 0,
    etat: etat === 'percu' ? 'percu' : 'non_percu',
    remarques: remarques ?? '',
  };
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  saveLignes(list);
  return row;
}

export function upsertManyLignes(annee, mois, compagnie, rows = []) {
  rows.forEach((r) => {
    upsertLigne({
      annee,
      mois,
      compagnie,
      eleveId: r.eleveId,
      montant: r.montant,
      etat: r.etat,
      remarques: r.remarques,
    });
  });
}

export function validateBatch(annee, mois, compagnie) {
  const key = buildDroitsBatchKey(annee, mois, compagnie);
  const batches = loadBatches();
  batches[key] = {
    ...batches[key],
    validatedAt: new Date().toISOString(),
    defaultMontant: batches[key]?.defaultMontant ?? defaultMontantForCompagnie(compagnie),
  };
  saveBatches(batches);
  return batches[key];
}

export function unlockBatch(annee, mois, compagnie) {
  const key = buildDroitsBatchKey(annee, mois, compagnie);
  const batches = loadBatches();
  if (!batches[key]) return null;
  batches[key] = { ...batches[key], validatedAt: null };
  saveBatches(batches);
  return batches[key];
}

export function setBatchDefaultMontant(annee, mois, compagnie, montant) {
  const key = buildDroitsBatchKey(annee, mois, compagnie);
  const batches = loadBatches();
  batches[key] = {
    ...batches[key],
    defaultMontant: Number(montant) || defaultMontantForCompagnie(compagnie),
  };
  saveBatches(batches);
  return batches[key];
}
