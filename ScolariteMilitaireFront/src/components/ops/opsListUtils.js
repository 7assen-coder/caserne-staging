/** True if any filter value is non-empty. */
export function hasActiveFilters(filters = {}) {
  return Object.entries(filters).some(([, v]) => String(v ?? '').trim() !== '');
}
