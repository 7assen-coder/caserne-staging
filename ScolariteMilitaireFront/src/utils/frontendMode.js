/** Mode frontend-only : pas d'appels API élèves (import / création locale uniquement). */
export function isFrontendOnly() {
  const flag = import.meta.env.VITE_FRONTEND_ONLY;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return import.meta.env.DEV;
}
