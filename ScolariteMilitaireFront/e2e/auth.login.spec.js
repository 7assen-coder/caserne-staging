import { test, expect } from '@playwright/test';

/**
 * Full login E2E — skipped unless E2E_EMAIL / E2E_PASSWORD are set.
 */
const email = process.env.E2E_EMAIL || '';
const password = process.env.E2E_PASSWORD || '';
const hasCreds = Boolean(email && password);

test.describe('auth.login', () => {
  test.skip(!hasCreds, 'Set E2E_EMAIL and E2E_PASSWORD to run');

  test('logs in and reaches dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /connexion|se connecter|connecter/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|eleves)/, { timeout: 60_000 });
  });
});
