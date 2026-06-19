const TOKEN_KEY = 'esp_token';
const REMEMBER_KEY = 'esp_remember_me';

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token, rememberMe = true) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, '1');
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function isRememberMeSession() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(REMEMBER_KEY) === '1';
}
