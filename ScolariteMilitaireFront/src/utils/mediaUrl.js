/**
 * Prefix relative /media/ paths with the API origin (split hosting: SPA ≠ API).
 * Absolute URLs and non-media paths are returned unchanged.
 * Supports VITE_API_BASE_URL ending in /api or /api/v1.
 */
export function mediaUrl(path) {
  if (path == null || path === '') return '';
  const raw = String(path).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:')) {
    return raw;
  }
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  if (!normalized.startsWith('/media/')) {
    return normalized;
  }

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
  let origin = '';
  if (/^https?:\/\//i.test(apiBase)) {
    try {
      const u = new URL(apiBase);
      origin = u.origin;
    } catch {
      origin = '';
    }
  }
  return origin ? `${origin}${normalized}` : normalized;
}
