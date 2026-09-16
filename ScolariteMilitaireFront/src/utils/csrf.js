import { apiPaths } from '../services/apiPaths';
/** CSRF cookie helpers for cookie-authenticated API calls. */

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([$()*+.?[\\\]^{|}])/g, '\\$1')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function getCsrfTokenFromCookie() {
  return readCookie('csrftoken') || readCookie('csrfToken') || '';
}

let csrfPromise = null;

/**
 * Ensure csrftoken cookie exists (via GET /auth/csrf/), return token string.
 */
export async function ensureCsrfToken(apiClient) {
  const existing = getCsrfTokenFromCookie();
  if (existing) return existing;
  if (!csrfPromise) {
    csrfPromise = apiClient
      .get(apiPaths.auth.csrf)
      .then(() => getCsrfTokenFromCookie())
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}
