import { test, expect } from '@playwright/test';

/**
 * Always-on CI smoke: login page loads without requiring API credentials.
 */
test.describe('login page smoke', () => {
  test('shows brand title and login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Polyspace|GESESP/i);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
