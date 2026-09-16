const REMEMBER_KEY = 'esp_remember_me';
const LEGACY_TOKEN_KEY = 'esp_token';

/** Wipe legacy JWT copies from browser storage (XSS surface). */
export function clearLegacyTokens() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAccessToken() {
  clearLegacyTokens();
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* ignore */
  }
}

export function setRememberMePreference(rememberMe = true) {
  if (typeof window === 'undefined') return;
  try {
    if (rememberMe) localStorage.setItem(REMEMBER_KEY, '1');
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* ignore */
  }
}

export function isRememberMeSession() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
}
