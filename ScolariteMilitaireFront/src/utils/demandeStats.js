export function computeDemandeStats(studentRows = []) {
  const withDemandes = studentRows.filter((r) => (r.nbDemandes ?? 0) > 0).length;
  return {
    totalStudents: studentRows.length,
    withDemandes,
    withoutDemandes: studentRows.length - withDemandes,
    totalDemandes: studentRows.reduce((s, r) => s + (r.nbDemandes ?? 0), 0),
  };
}

export function buildDemandeDetailExportRows(students = [], demandes = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return (demandes ?? [])
    .filter((d) => byStudent[String(d.eleveId)])
    .map((item) => ({ item, student: byStudent[String(item.eleveId)] }));
}
