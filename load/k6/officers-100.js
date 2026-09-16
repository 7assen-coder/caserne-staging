import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { baseUrl, thresholds } from './lib/config.js';
import { login } from './lib/auth.js';

const iter = new Counter('officer_iterations');

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    ...thresholds,
    http_req_failed: ['rate<0.01'],
    // After wake, list/detail should stay under 2s p95; login up to 3s
    'http_req_duration{name:login}': ['p(95)<3000'],
    'http_req_duration{name:eleves_list}': ['p(95)<2000'],
    'http_req_duration{name:eleves_detail}': ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  const root = baseUrl();
  // Wake Render free dyno
  http.get(`${root}/api/healthz/`, { timeout: '120s' });
  sleep(2);
  return { root };
}

export default function () {
  const email = __ENV.K6_EMAIL;
  const password = __ENV.K6_PASSWORD;
  if (!email || !password) {
    throw new Error('Set K6_EMAIL and K6_PASSWORD');
  }

  const root = baseUrl();
  const n = iter.add(1);

  login(email, password);

  const list = http.get(`${root}/api/v1/eleves/?page=1&page_size=25`, {
    tags: { name: 'eleves_list' },
  });
  check(list, { 'eleves list 200': (r) => r.status === 200 });

  let detailId = null;
  try {
    const body = list.json();
    const results = body.results || body;
    if (Array.isArray(results) && results.length) {
      detailId = results[0].id;
    }
  } catch (_) {
    /* ignore */
  }

  if (detailId) {
    const detail = http.get(`${root}/api/v1/eleves/${detailId}/`, {
      tags: { name: 'eleves_detail' },
    });
    check(detail, { 'eleves detail 200': (r) => r.status === 200 });
  }

  const stats = http.get(`${root}/api/v1/eleves/stats/`, {
    tags: { name: 'dashboard_stats' },
  });
  check(stats, { 'dashboard-stats 200': (r) => r.status === 200 });

  if (n % 10 === 0) {
    const hz = http.get(`${root}/api/healthz/`, { tags: { name: 'healthz' } });
    check(hz, { 'healthz 200': (r) => r.status === 200 });
  }

  sleep(1 + Math.random() * 2);
}
