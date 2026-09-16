export function computeEquipementStats(studentRows = []) {
  const withItems = studentRows.filter((r) => (r.nbItems ?? 0) > 0).length;
  const totalItems = studentRows.reduce((sum, r) => sum + (r.nbItems ?? 0), 0);
  return {
    totalStudents: studentRows.length,
    withItems,
    withoutItems: studentRows.length - withItems,
    totalItems,
    enUsage: totalItems,
    rendu: 0,
  };
}

export function buildDetailExportRows(students = [], items = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return (items ?? [])
    .filter((item) => byStudent[String(item.eleveId)])
    .map((item) => ({ item, student: byStudent[String(item.eleveId)] }));
}
