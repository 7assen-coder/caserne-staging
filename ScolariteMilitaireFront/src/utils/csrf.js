import { apiPaths } from '../services/apiPaths';
/** CSRF helpers for cookie-authenticated API calls (SPA may be cross-origin). */

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([$()*+.?[\\\]^{|}])/g, '\\$1')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function getCsrfTokenFromCookie() {
  return readCookie('csrftoken') || readCookie('csrfToken') || '';
}

let csrfPromise = null;
/** In-memory token from GET /auth/csrf/ body (cross-origin Set-Cookie is not in document.cookie). */
let csrfTokenMemory = '';

/**
 * Ensure CSRF is primed (GET /auth/csrf/ sets cookie on the API host) and return
 * the token for X-CSRFToken. Prefer readable cookie, then response body, then memory.
 */
export async function ensureCsrfToken(apiClient) {
  const existing = getCsrfTokenFromCookie() || csrfTokenMemory;
  if (existing) return existing;
  if (!csrfPromise) {
    csrfPromise = apiClient
      .get(apiPaths.auth.csrf)
      .then((res) => {
        const fromCookie = getCsrfTokenFromCookie();
        const fromBody = (res?.data?.csrfToken || '').trim();
        csrfTokenMemory = fromCookie || fromBody || csrfTokenMemory;
        return csrfTokenMemory;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}
