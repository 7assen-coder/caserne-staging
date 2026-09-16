export const JOURNAL_CHANGED = 'esp-journal-changed';

export function loadJournalEntries() {
  return [];
}

export function addJournalEntry() {
  throw new Error('journalStore: use journalService (API).');
}

export function updateJournalEntry() {
  throw new Error('journalStore: use journalService (API).');
}

export function deleteJournalEntry() {
  throw new Error('journalStore: use journalService (API).');
}
