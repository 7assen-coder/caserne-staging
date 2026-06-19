import { loadJournalEntries } from './journalStore';

export function computeJournalStats(studentRows = []) {
  const all = loadJournalEntries();
  const studentIds = new Set(studentRows.map((r) => String(r.id)));
  const relevant = all.filter((e) => studentIds.has(String(e.eleveId)));

  const withEntries = studentRows.filter((r) => (r.nbEntrees ?? 0) > 0).length;
  const byType = {};
  relevant.forEach((e) => {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  });

  return {
    totalStudents: studentRows.length,
    withEntries,
    withoutEntries: studentRows.length - withEntries,
    totalEntries: relevant.length,
    byType,
  };
}

export function buildJournalDetailExportRows(students = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return loadJournalEntries()
    .filter((item) => byStudent[String(item.eleveId)])
    .map((item) => ({
      item,
      student: byStudent[String(item.eleveId)],
    }))
    .sort((a, b) => String(b.item.date).localeCompare(String(a.item.date)));
}
