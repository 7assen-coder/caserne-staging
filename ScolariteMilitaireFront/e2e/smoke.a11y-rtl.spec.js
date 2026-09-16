import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 35 — login a11y + Arabic RTL', () => {
  test('login page has no critical axe violations', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Connexion|تسجيل الدخول/i })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact),
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('AR switch sets document dir=rtl and Arabic title', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'AR', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();
  });

  test('modal focus trap and Escape', async ({ page }) => {
    await page.goto('/__a11y__/modal');
    await page.getByRole('button', { name: 'Open test modal' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Test dialog' })).toBeVisible();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
