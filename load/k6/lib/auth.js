import http from 'k6/http';
import { check } from 'k6';
import { baseUrl } from './config.js';

/**
 * Cookie + CSRF login against polyspace API.
 * Returns jar cookies usable on subsequent requests (k6 tracks Set-Cookie on the jar).
 */
export function login(email, password) {
  const root = baseUrl();
  const csrfRes = http.get(`${root}/api/v1/auth/csrf/`);
  check(csrfRes, { 'csrf 200': (r) => r.status === 200 });

  const csrf =
    csrfRes.cookies.csrftoken && csrfRes.cookies.csrftoken.length
      ? csrfRes.cookies.csrftoken[0].value
      : '';

  const loginRes = http.post(
    `${root}/api/v1/auth/login/`,
    JSON.stringify({ email, password, remember_me: true }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrf,
        Referer: root,
      },
      tags: { name: 'login' },
    },
  );

  check(loginRes, {
    'login 200': (r) => r.status === 200,
    'login has access cookie': (r) =>
      Boolean(r.cookies.esp_access && r.cookies.esp_access.length),
  });

  return loginRes;
}

export function authHeadersFromLogin(loginRes) {
  const csrf =
    (loginRes.cookies.csrftoken &&
      loginRes.cookies.csrftoken[0] &&
      loginRes.cookies.csrftoken[0].value) ||
    '';
  return {
    'X-CSRFToken': csrf,
    Referer: baseUrl(),
  };
}
