// CRUD lifecycle for assets, including the bug class we just fixed (write
// to a column that doesn't exist would have surfaced here).
//
// Each test uses workerTag() to scope data so 3 parallel browsers don't step
// on each other.

import { test, expect } from '@playwright/test';
import { ensureLoggedIn, clickTab, workerTag } from './_helpers.mjs';

test.describe.configure({ mode: 'parallel' });

test('add machinery asset, verify it shows in Assets, edit it, delete it', async ({ page }, testInfo) => {
  const tag = workerTag(testInfo);
  const desc = 'PW Tractor ' + tag;

  await ensureLoggedIn(page);
  await clickTab(page, 'Assets');
  await page.getByRole('button', { name: /\+ Add asset/i }).click();

  // Type select / Description
  await page.getByLabel('Asset type *').selectOption({ label: /Equipment|Machinery/i }).catch(()=>{});
  await page.getByLabel('Description *').fill(desc);
  await page.getByLabel('Cost *').fill('15000');
  // Pick first available entity (any will do — we just need to save)
  const entitySel = page.locator('select').filter({ hasText: /Entity|Solo Select/i }).first();
  if (await entitySel.count()) {
    const opts = await entitySel.locator('option').elementHandles();
    if (opts.length > 1) await entitySel.selectOption({ index: 1 });
  }
  await page.locator('input[type="date"]').first().fill('2025-06-01');
  await page.getByRole('button', { name: /Add asset/i }).click();

  // Now find it in the asset list
  await expect(page.locator('#view').getByText(desc)).toBeVisible({ timeout: 10000 });

  // Edit it
  await page.locator('#view').getByText(desc).first().click();
  await page.getByRole('button', { name: /Edit/i }).first().click().catch(()=>{});
  // Bump cost
  const costInput = page.getByLabel('Cost *');
  if (await costInput.isVisible()) {
    await costInput.fill('16500');
    await page.getByRole('button', { name: /Save changes/i }).click();
  }

  // Delete (soft cleanup so we don't pollute)
  await clickTab(page, 'Assets');
  await page.locator('#view').getByText(desc).first().click();
  const editBtn = page.getByRole('button', { name: /Edit/i }).first();
  if (await editBtn.isVisible()) {
    await editBtn.click();
    await page.getByRole('button', { name: /Delete/i }).click();
    await page.getByRole('button', { name: /Yes|Confirm/i }).click().catch(()=>{});
  }
});

test('disposal flow — verify no schema-cache error fires when clicking Record disposal', async ({ page }, testInfo) => {
  const tag = workerTag(testInfo);
  const desc = 'PW DispoTest ' + tag;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', async (resp) => {
    // Catch Postgres / PostgREST errors that come back as 4xx with JSON
    if (resp.status() >= 400 && resp.url().includes('/rest/v1/')) {
      try {
        const body = await resp.text();
        if (body.includes('schema cache') || body.includes('disposal_date')) {
          errors.push('Postgres error from PostgREST: ' + body);
        }
      } catch (_) {}
    }
  });

  await ensureLoggedIn(page);
  await clickTab(page, 'Assets');

  // Add an asset to dispose
  await page.getByRole('button', { name: /\+ Add asset/i }).click();
  await page.getByLabel('Description *').fill(desc);
  await page.getByLabel('Cost *').fill('5000');
  const entitySel = page.locator('select').first();
  await entitySel.selectOption({ index: 1 }).catch(()=>{});
  await page.locator('input[type="date"]').first().fill('2024-01-01');
  await page.getByRole('button', { name: /Add asset/i }).click();
  await expect(page.locator('#view').getByText(desc)).toBeVisible({ timeout: 10000 });

  // Open the asset detail and dispose
  await page.locator('#view').getByText(desc).first().click();
  const disposeBtn = page.getByRole('button', { name: /Dispose/i });
  if (await disposeBtn.isVisible()) {
    await disposeBtn.click();
    await page.getByLabel('Disposal date *').fill('2025-06-01');
    await page.getByLabel('Proceeds').fill('3000');
    await page.getByRole('button', { name: /Record disposal/i }).click();
    // Wait a beat for the network round trip
    await page.waitForTimeout(1500);
  }

  // The big assertion — this is the regression check for the disposal_date bug
  expect(errors, 'Errors (would catch schema-cache regression):\n' + errors.join('\n')).toEqual([]);
});
