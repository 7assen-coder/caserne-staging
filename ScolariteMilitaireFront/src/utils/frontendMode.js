/** Mock élèves explicite uniquement (jamais auto en DEV/prod). */
export function useMockEleves() {
  return import.meta.env.VITE_USE_MOCK_ELEVES === 'true';
}

/**
 * Mode frontend-only : pas d'appels API élèves (import / création locale).
 * Explicit true/false only — unset defaults to false so DEV alone never
 * resurrects the 64 fake élèves.
 */
export function isFrontendOnly() {
  const flag = import.meta.env.VITE_FRONTEND_ONLY;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return false;
}
