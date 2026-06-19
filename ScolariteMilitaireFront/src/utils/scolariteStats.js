import { SEMESTRE_KEYS } from '../data/scolariteSemestres';

export function computeScolariteStats(rows = []) {
  let validations = 0;
  let integral = 0;
  let partial = 0;
  let none = 0;
  let enMobilite = 0;
  let redoublement = 0;

  rows.forEach((row) => {
    if (row.mobilite?.type) enMobilite += 1;
    if (row.statutAcademique === 'repeat') redoublement += 1;
    SEMESTRE_KEYS.forEach((key) => {
      const v = row.semestres?.[key];
      if (!v) return;
      validations += 1;
      if (v === 'integral') integral += 1;
      else if (v === 'partial') partial += 1;
      else if (v === 'none') none += 1;
    });
  });

  return {
    totalStudents: rows.length,
    validations,
    integral,
    partial,
    none,
    enMobilite,
    redoublement,
  };
}
