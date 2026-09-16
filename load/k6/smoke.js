import http from 'k6/http';
import { check, sleep } from 'k6';
import { baseUrl, thresholds } from './lib/config.js';
import { login } from './lib/auth.js';

export const options = {
  vus: 5,
  duration: '1m',
  thresholds,
};

export default function () {
  const email = __ENV.K6_EMAIL;
  const password = __ENV.K6_PASSWORD;
  if (!email || !password) {
    throw new Error('Set K6_EMAIL and K6_PASSWORD');
  }

  const root = baseUrl();
  const health = http.get(`${root}/api/healthz/`);
  check(health, { 'healthz 200': (r) => r.status === 200 });

  login(email, password);

  const list = http.get(`${root}/api/v1/eleves/?page=1&page_size=25`);
  check(list, { 'eleves list 200': (r) => r.status === 200 });

  sleep(1);
}
