export function computeJournalStats(studentRows = []) {
  return {
    totalStudents: studentRows.length,
    withEvents: studentRows.filter((r) => (r.nbEvenements ?? 0) > 0).length,
    totalEvents: studentRows.reduce((s, r) => s + (r.nbEvenements ?? 0), 0),
  };
}

export function buildJournalDetailExportRows(students = [], entries = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return (entries ?? [])
    .filter((e) => byStudent[String(e.eleveId)])
    .map((item) => ({ item, student: byStudent[String(item.eleveId)] }));
}
