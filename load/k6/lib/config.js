/**
 * Shared k6 config from env.
 *
 * Staging gate thresholds (below) are looser than production SLOs.
 * Prod targets: docs/ops-slo-capacity.md (e.g. login p95 < 2s, list p95 < 1s).
 * Staging officers-100 gate: login p95 < 3s, list/detail p95 < 2s — go-live only, not prod proof.
 */
export function baseUrl() {
  const raw = __ENV.BASE_URL || 'https://polyspace-api.onrender.com';
  return raw.replace(/\/$/, '');
}

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<3000'],
  checks: ['rate>0.99'],
};
