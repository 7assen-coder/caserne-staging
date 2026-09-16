import { test, expect } from '@playwright/test';

const api = process.env.E2E_API_URL || '';

test.describe('smoke.health', () => {
  test.skip(!api, 'Set E2E_API_URL to run');

  test('API healthz returns 200', async ({ request }) => {
    const base = api.replace(/\/$/, '');
    const res = await request.get(`${base}/api/healthz/`);
    expect(res.status()).toBe(200);
  });
});
