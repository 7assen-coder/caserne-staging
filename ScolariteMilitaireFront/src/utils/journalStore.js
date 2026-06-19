import { buildJournalCode } from '../data/journalCatalog';

const STORAGE_KEY = 'esp_journal_v1';
export const JOURNAL_CHANGED = 'esp-journal-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(JOURNAL_CHANGED));
  }
}

export function loadJournalEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJournalEntries(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  notifyChanged();
}

export function getJournalByEleveId(eleveId) {
  const key = String(eleveId ?? '');
  if (!key) return [];
  return loadJournalEntries()
    .filter((item) => String(item.eleveId) === key)
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
}

export function countJournalByEleveId(eleveId) {
  return getJournalByEleveId(eleveId).length;
}

export function getLastJournalByEleveId(eleveId) {
  const items = getJournalByEleveId(eleveId);
  return items[0] ?? null;
}

export function findJournalEntryById(id) {
  return loadJournalEntries().find((item) => String(item.id) === String(id)) ?? null;
}

function newId() {
  return `jrn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addJournalEntry(payload) {
  const existing = getJournalByEleveId(payload.eleveId);
  const code =
    payload.code?.trim()
    || buildJournalCode(payload.type, existing.length + 1);
  const item = {
    id: newId(),
    eleveId: String(payload.eleveId),
    code,
    type: payload.type ?? 'observation',
    date: payload.date ?? new Date().toISOString().slice(0, 10),
    titre: payload.titre ?? '',
    contenu: payload.contenu ?? '',
    auteur: payload.auteur ?? '',
    pjPdf: payload.pjPdf ?? null,
  };
  const next = [...loadJournalEntries(), item];
  saveJournalEntries(next);
  return item;
}

export function updateJournalEntry(id, patch) {
  const list = loadJournalEntries();
  const idx = list.findIndex((item) => String(item.id) === String(id));
  if (idx < 0) return null;
  const updated = {
    ...list[idx],
    ...patch,
    id: list[idx].id,
    eleveId: list[idx].eleveId,
  };
  list[idx] = updated;
  saveJournalEntries(list);
  return updated;
}

export function deleteJournalEntry(id) {
  const list = loadJournalEntries();
  const next = list.filter((item) => String(item.id) !== String(id));
  if (next.length === list.length) return false;
  saveJournalEntries(next);
  return true;
}
