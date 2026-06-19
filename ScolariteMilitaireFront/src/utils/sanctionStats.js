import { loadSanctions } from './sanctionStore';

export function computeSanctionStats(studentRows = []) {
  const all = loadSanctions();
  const studentIds = new Set(studentRows.map((r) => String(r.id)));
  const relevant = all.filter((s) => studentIds.has(String(s.eleveId)));

  const enCours = relevant.filter((s) => s.statut === 'en_cours').length;
  const cloturees = relevant.filter((s) => s.statut === 'cloturee').length;
  const annulees = relevant.filter((s) => s.statut === 'annulee').length;
  const withSanctions = studentRows.filter((r) => (r.nbSanctions ?? 0) > 0).length;

  return {
    totalStudents: studentRows.length,
    withSanctions,
    withoutSanctions: studentRows.length - withSanctions,
    totalSanctions: relevant.length,
    enCours,
    cloturees,
    annulees,
  };
}

export function buildSanctionDetailExportRows(students = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return loadSanctions()
    .filter((item) => byStudent[String(item.eleveId)])
    .map((item) => ({
      item,
      student: byStudent[String(item.eleveId)],
    }))
    .sort((a, b) => String(b.item.dateDebut).localeCompare(String(a.item.dateDebut)));
}
