import { loadDemandes } from './demandeStore';

export function computeDemandeStats(studentRows = []) {
  const all = loadDemandes();
  const studentIds = new Set(studentRows.map((r) => String(r.id)));
  const relevant = all.filter((d) => studentIds.has(String(d.eleveId)));

  const enCours = relevant.filter((d) => d.statut === 'en_cours').length;
  const acceptees = relevant.filter((d) => d.statut === 'acceptee').length;
  const refusees = relevant.filter((d) => d.statut === 'refusee').length;
  const withDemandes = studentRows.filter((r) => (r.nbDemandes ?? 0) > 0).length;

  return {
    totalStudents: studentRows.length,
    withDemandes,
    withoutDemandes: studentRows.length - withDemandes,
    totalDemandes: relevant.length,
    enCours,
    acceptees,
    refusees,
  };
}

export function buildDemandeDetailExportRows(students = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return loadDemandes()
    .filter((item) => byStudent[String(item.eleveId)])
    .map((item) => ({ item, student: byStudent[String(item.eleveId)] }))
    .sort((a, b) => String(b.item.dateDepot).localeCompare(String(a.item.dateDepot)));
}
