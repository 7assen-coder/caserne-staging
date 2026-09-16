import { test, expect } from '@playwright/test';

const email = process.env.E2E_EMAIL || '';
const password = process.env.E2E_PASSWORD || '';
const hasCreds = Boolean(email && password);

test.describe('eleves.list', () => {
  test.skip(!hasCreds, 'Set E2E_EMAIL and E2E_PASSWORD to run');

  test('opens dossiers list without hanging', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /connexion|se connecter|connecter/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|eleves)/, { timeout: 60_000 });

    await page.goto('/eleves/dossiers');
    await expect(page.locator('body')).not.toBeEmpty();
    // Table, empty state, or heading — anything that means the page rendered
    const marker = page
      .getByRole('table')
      .or(page.getByText(/aucun|dossier|étudiant|élève/i))
      .first();
    await expect(marker).toBeVisible({ timeout: 30_000 });
  });
});
