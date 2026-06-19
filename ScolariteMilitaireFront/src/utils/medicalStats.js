import { loadConsultations } from './medicalStore';

export function computeMedicalStats(studentRows = []) {
  const all = loadConsultations();
  const studentIds = new Set(studentRows.map((r) => String(r.id)));
  const relevant = all.filter((c) => studentIds.has(String(c.eleveId)));

  const consultations = relevant.filter((c) => c.type === 'consultation').length;
  const incidents = relevant.filter((c) => c.type === 'incident').length;
  const withConsultations = studentRows.filter((r) => (r.nbConsultations ?? 0) > 0).length;

  return {
    totalStudents: studentRows.length,
    withConsultations,
    withoutConsultations: studentRows.length - withConsultations,
    totalConsultations: relevant.length,
    consultations,
    incidents,
  };
}

export function buildMedicalDetailExportRows(students = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return loadConsultations()
    .filter((item) => byStudent[String(item.eleveId)])
    .map((item) => ({ item, student: byStudent[String(item.eleveId)] }))
    .sort((a, b) => String(b.item.dateConsultation).localeCompare(String(a.item.dateConsultation)));
}
