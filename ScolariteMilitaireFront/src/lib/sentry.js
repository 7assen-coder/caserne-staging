/** Phase 32 — Sentry (errors only; DSN from env). */
import * as Sentry from '@sentry/react';

const dsn = (import.meta.env.VITE_SENTRY_DSN || '').trim();
const environment = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development').trim();

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0) || 0,
    sendDefaultPii: false,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        const data = breadcrumb.data || {};
        if (data.url && /token|password|authorization/i.test(String(data.url))) {
          return null;
        }
      }
      return breadcrumb;
    },
  });
}
