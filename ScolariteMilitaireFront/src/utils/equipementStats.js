import { loadEquipementItems } from './equipementStore';

export function computeEquipementStats(studentRows = []) {
  const allItems = loadEquipementItems();
  const studentIds = new Set(studentRows.map((r) => String(r.id)));
  const relevantItems = allItems.filter((i) => studentIds.has(String(i.eleveId)));

  const totalItems = relevantItems.length;
  const enUsage = relevantItems.filter((i) => i.etat !== 'rendu').length;
  const rendu = relevantItems.filter((i) => i.etat === 'rendu').length;
  const withItems = studentRows.filter((r) => (r.nbItems ?? 0) > 0).length;

  return {
    totalStudents: studentRows.length,
    withItems,
    withoutItems: studentRows.length - withItems,
    totalItems,
    enUsage,
    rendu,
  };
}

export function buildDetailExportRows(students = []) {
  const byStudent = Object.fromEntries(students.map((s) => [String(s.id), s]));
  return loadEquipementItems()
    .filter((item) => byStudent[String(item.eleveId)])
    .map((item) => {
      const s = byStudent[String(item.eleveId)];
      return { item, student: s };
    });
}
