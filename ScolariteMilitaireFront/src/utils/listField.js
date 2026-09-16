/** Comma-separated multi-value fields (assureur, antécédents, etc.). */

export function parseListField(raw) {
  if (raw == null) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Canonical storage: "a, b, c" */
export function formatListField(raw) {
  return parseListField(raw).join(', ');
}

/** Fiche / PDF display: "a · b · c" */
export function formatListFieldDisplay(raw) {
  const parts = parseListField(raw);
  return parts.length ? parts.join(' · ') : '';
}
