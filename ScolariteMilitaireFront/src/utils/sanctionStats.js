export function computeSanctionStats(studentRows = []) {
  const withSanctions = studentRows.filter((r) => (r.nbSanctions ?? 0) > 0).length;
  const total = studentRows.reduce((sum, r) => sum + (r.nbSanctions ?? 0), 0);
  const enCours = studentRows.reduce((sum, r) => sum + (r.enCours ?? 0), 0);
  return {
    totalStudents: studentRows.length,
    withSanctions,
    withoutSanctions: studentRows.length - withSanctions,
    totalSanctions: total,
    enCours,
  };
}

export function buildSanctionDetailExportRows(students = [], sanctions = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return (sanctions ?? [])
    .filter((s) => byStudent[String(s.eleveId)])
    .map((sanction) => ({ sanction, student: byStudent[String(sanction.eleveId)] }));
}
