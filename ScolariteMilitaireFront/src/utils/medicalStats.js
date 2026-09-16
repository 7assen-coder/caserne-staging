export function computeMedicalStats(studentRows = []) {
  return {
    totalStudents: studentRows.length,
    withConsultations: studentRows.filter((r) => (r.nbConsultations ?? 0) > 0).length,
    totalConsultations: studentRows.reduce((s, r) => s + (r.nbConsultations ?? 0), 0),
  };
}

export function buildMedicalDetailExportRows(students = [], consultations = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return (consultations ?? [])
    .filter((c) => byStudent[String(c.eleveId)])
    .map((item) => ({ item, student: byStudent[String(item.eleveId)] }));
}
