// Smoke tests: the app loads, every tab renders, no JS errors fire.
// Run in 3 browsers parallel via the Playwright config.

import { test, expect } from '@playwright/test';
import { ensureLoggedIn, clickTab } from './_helpers.mjs';

test.describe('Smoke', () => {
  test('app loads, every tab renders without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    await ensureLoggedIn(page);

    const tabs = ['Dashboard','Assets','Recip Mares','Horses','Properties',
                  'Transfers','Disposals','Reports','Entities','Categories'];
    for (const t of tabs) {
      await clickTab(page, t);
      // The h2 of each view must render
      await expect(page.locator('#view h2').first()).toBeVisible({ timeout: 5000 });
    }

    // No uncaught errors
    expect(errors, 'Console / page errors:\n' + errors.join('\n')).toEqual([]);
  });

  test('Reports dropdown contains all expected entries including Form 4797 and Form 4562', async ({ page }) => {
    await ensureLoggedIn(page);
    await clickTab(page, 'Reports');
    const reportSelect = page.getByRole('combobox').first();
    const options = await reportSelect.locator('option').allTextContents();
    expect(options).toEqual(expect.arrayContaining([
      'Asset roll-forward',
      'Depreciation schedule',
      'Disposal report',
      expect.stringMatching(/Form 4797/),
      expect.stringMatching(/Form 4562/),
      'Current inventory',
      'Summary by entity',
      'Summary by category',
    ]));
  });

  test('Form 4797 view renders the totals card', async ({ page }) => {
    await ensureLoggedIn(page);
    await clickTab(page, 'Reports');
    await page.getByRole('combobox').first().selectOption({ label: /Form 4797/ });
    await expect(page.locator('#view').getByText(/Form 4797 totals/)).toBeVisible();
  });

  test('Form 4562 view renders the totals card', async ({ page }) => {
    await ensureLoggedIn(page);
    await clickTab(page, 'Reports');
    await page.getByRole('combobox').first().selectOption({ label: /Form 4562/ });
    await expect(page.locator('#view').getByText(/Form 4562 totals/)).toBeVisible();
  });
});
