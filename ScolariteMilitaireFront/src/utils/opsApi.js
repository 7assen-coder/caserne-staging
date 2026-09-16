import { api, withUploadTimeout } from '../services/api';
import { isFrontendOnly } from './frontendMode';

/** Guard: operational data must not be written to localStorage in API mode. */
export function assertApiSourceOfTruth(storeName) {
  if (!isFrontendOnly()) {
    throw new Error(
      `[source-of-truth] Write to ${storeName} bloqué hors mode VITE_FRONTEND_ONLY=true.`,
    );
  }
}

export function notifyChanged(eventName) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

function maybeUploadConfig(body, config) {
  if (body instanceof FormData) {
    return withUploadTimeout(config || {});
  }
  return config;
}

/** Fetch all pages from a DRF paginated list endpoint. */
export async function apiList(path, params = {}) {
  const rows = [];
  let url = path;
  let query = { ...params };
  let guard = 0;
  while (url && guard < 100) {
    guard += 1;
    const { data } = await api.get(url, query ? { params: query } : undefined);
    query = null;
    if (Array.isArray(data)) {
      rows.push(...data);
      break;
    }
    if (Array.isArray(data?.results)) rows.push(...data.results);
    const next = data?.next;
    if (!next) break;
    try {
      const u = new URL(next, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      url = `${u.pathname.replace(/^\/api/, '')}${u.search}`;
      if (!url.startsWith('/')) url = `/${url}`;
    } catch {
      break;
    }
  }
  return rows;
}

export async function apiGet(path) {
  const { data } = await api.get(path);
  return data;
}

export async function apiPost(path, body, config) {
  const { data } = await api.post(path, body, maybeUploadConfig(body, config));
  return data;
}

export async function apiPatch(path, body, config) {
  const payload = body && typeof body === 'object' && !(body instanceof FormData)
    ? { ...body }
    : body;
  const { data } = await api.patch(path, payload, maybeUploadConfig(payload, config));
  return data;
}

export async function apiPut(path, body, config) {
  const { data } = await api.put(path, body, maybeUploadConfig(body, config));
  return data;
}

export async function apiDelete(path, config) {
  await api.delete(path, config);
}

/** Attach optimistic lock token for ops mutations. */
export function withExpectedVersion(body, rowVersion) {
  const v = Number(rowVersion);
  if (!Number.isFinite(v) || v < 1) return body;
  if (body instanceof FormData) {
    body.append('expected_version', String(v));
    return body;
  }
  return { ...(body || {}), expected_version: v };
}

export function toFormData(fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) fd.append(key, value);
    else fd.append(key, String(value));
  });
  return fd;
}
