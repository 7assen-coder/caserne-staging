/** French calendar date helpers (JJ/MM/AAAA ↔ ISO YYYY-MM-DD). */

/** Digits only, auto-insert slashes as the user types. */
export function sanitizeDateFrInput(raw) {
  const d = String(raw ?? '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** @returns {string} YYYY-MM-DD or '' if invalid / incomplete */
export function parseFrToIso(fr) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(fr ?? '').trim());
  if (!m) return '';
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (yyyy < 1900 || yyyy > 2100) return '';
  const dt = new Date(yyyy, mm - 1, dd);
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return '';
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** @returns {string} JJ/MM/AAAA or '' */
export function formatIsoToFr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? '').trim());
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Accept ISO or FR; return ISO or ''. */
export function toIsoDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.slice(0, 10);
    return parseFrToIso(formatIsoToFr(iso)) ? iso : '';
  }
  return parseFrToIso(s);
}

export function validateDateNaissanceValue(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return 'La date de naissance est obligatoire.';
  if (!toIsoDate(s)) return 'Indiquez une date valide (JJ/MM/AAAA).';
  return '';
}
