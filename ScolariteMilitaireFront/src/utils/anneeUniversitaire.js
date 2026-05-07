export function getCurrentAcademicYear(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

export function getRecentAcademicYears(now = new Date(), span = 6) {
  const current = getCurrentAcademicYear(now);
  const startYear = Number(current.split('-')[0]);
  const out = [];
  for (let i = 0; i < span; i++) {
    const a = startYear - i;
    out.push(`${a}-${a + 1}`);
  }
  return out;
}

export function getAcademicYearOptions(now = new Date(), span = 6) {
  return getRecentAcademicYears(now, span).map((v) => ({ value: v, label: v }));
}

export function todayIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
