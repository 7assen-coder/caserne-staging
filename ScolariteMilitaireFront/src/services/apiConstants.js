/** Phase 22 — shared Axios / Vite / auth bootstrap timings. */

export const API_TIMEOUT_MS = 90_000;
export const API_UPLOAD_TIMEOUT_MS = 180_000;
export const API_IMPORT_UPLOAD_TIMEOUT_MS = 180_000;
export const AUTH_BOOTSTRAP_TIMEOUT_MS = 15_000;
export const AUTH_BOOTSTRAP_HARD_FALLBACK_MS = 20_000;
export const TRANSIENT_RETRY_MAX = 2;
export const TRANSIENT_RETRY_BASE_DELAY_MS = 400;
export const VITE_PROXY_TIMEOUT_MS = 120_000;

/** Custom event when cookie refresh fails — AuthContext clears session. */
export const AUTH_EXPIRED_EVENT = 'esp:auth-expired';
