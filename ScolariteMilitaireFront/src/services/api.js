import axios from 'axios';
import { formatApiError } from '../utils/apiErrors';
import { clearLegacyTokens } from '../utils/authStorage';
import { ensureCsrfToken, getCsrfTokenFromCookie } from '../utils/csrf';
import {
  API_TIMEOUT_MS,
  API_UPLOAD_TIMEOUT_MS,
  AUTH_EXPIRED_EVENT,
  TRANSIENT_RETRY_BASE_DELAY_MS,
  TRANSIENT_RETRY_MAX,
} from './apiConstants';
import { AUTH_NO_REFRESH_RE, apiPaths } from './apiPaths';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
});

export function withUploadTimeout(config = {}) {
  return { ...config, timeout: API_UPLOAD_TIMEOUT_MS };
}

let refreshPromise = null;

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const csrf = await ensureCsrfToken(api);
      await api.post(
        apiPaths.auth.refresh,
        {},
        {
          headers: csrf ? { 'X-CSRFToken': csrf } : {},
          _skipAuthRefresh: true,
          _skipTransientRetry: true,
        },
      );
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function notifyAuthExpired() {
  clearLegacyTokens();
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  } catch {
    /* SSR / tests */
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(error) {
  const status = error.response?.status;
  if (status && [408, 429, 502, 503, 504].includes(status)) return true;
  if (error.response) return false;
  const code = error.code || '';
  return ['ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT'].includes(code);
}

function isSafeMethod(config) {
  const method = (config.method || 'get').toLowerCase();
  return ['get', 'head', 'options'].includes(method);
}

api.interceptors.request.use(async (config) => {
  clearLegacyTokens();
  const method = (config.method || 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    let csrf = getCsrfTokenFromCookie();
    if (!csrf) {
      try {
        csrf = await ensureCsrfToken(api);
      } catch {
        /* login may still set cookie via ensure_csrf_cookie on GET */
      }
    }
    if (csrf) {
      config.headers = config.headers || {};
      config.headers['X-CSRFToken'] = csrf;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    error.userMessage = formatApiError(error);
    const original = error.config;
    if (!original) {
      return Promise.reject(error);
    }

    const url = original.url || '';

    if (
      !original._skipAuthRefresh &&
      !original._retry &&
      error.response?.status === 401 &&
      !AUTH_NO_REFRESH_RE.test(url)
    ) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch (refreshErr) {
        notifyAuthExpired();
        refreshErr.userMessage = formatApiError(refreshErr);
        return Promise.reject(refreshErr);
      }
    }

    if (
      !original._skipTransientRetry &&
      isSafeMethod(original) &&
      isTransientError(error) &&
      !AUTH_NO_REFRESH_RE.test(url)
    ) {
      const attempt = original._transientAttempt || 0;
      if (attempt < TRANSIENT_RETRY_MAX) {
        original._transientAttempt = attempt + 1;
        const delay =
          TRANSIENT_RETRY_BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 150);
        await sleep(delay);
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);
