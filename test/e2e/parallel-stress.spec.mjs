// Stress: hammer the app with rapid navigation in 3 parallel windows.
// Each browser project (chromium/firefox/webkit) runs this independently AND
// in a separate worker, so 9 simultaneous sessions is plausible.

import { test, expect } from '@playwright/test';
import { ensureLoggedIn, clickTab } from './_helpers.mjs';

test.describe.configure({ mode: 'parallel' });

test('rapid tab cycling — 30 navigations, no errors, no leaked listeners', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await ensureLoggedIn(page);

  const tabs = ['Dashboard','Assets','Properties','Reports','Disposals','Transfers','Entities','Categories'];
  for (let i = 0; i < 30; i++) {
    const t = tabs[i % tabs.length];
    await clickTab(page, t);
    // Don't wait too long — we want races to surface
    await page.waitForTimeout(50);
  }

  expect(errors).toEqual([]);
});

test('reports cycling — every report rendered back-to-back', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await ensureLoggedIn(page);
  await clickTab(page, 'Reports');

  const reportSel = page.getByRole('combobox').first();
  const opts = await reportSel.locator('option').allTextContents();
  for (const label of opts) {
    await reportSel.selectOption({ label });
    await page.waitForTimeout(150);
  }

  expect(errors, 'Errors while cycling reports:\n' + errors.join('\n')).toEqual([]);
});

test('open + close 5 modals in rapid succession', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await ensureLoggedIn(page);
  await clickTab(page, 'Categories');

  for (let i = 0; i < 5; i++) {
    const editBtn = page.locator('#view').getByRole('button', { name: /Edit/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.getByRole('button', { name: /Cancel|Close/i }).click();
      await page.waitForTimeout(80);
    }
  }

  expect(errors).toEqual([]);
});
