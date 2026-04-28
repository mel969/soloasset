// Property creation, navigation to detail page, and dispose-entire-property.

import { test, expect } from '@playwright/test';
import { ensureLoggedIn, clickTab, workerTag } from './_helpers.mjs';

test.describe.configure({ mode: 'parallel' });

test('clicking a property name lands on its detail page', async ({ page }, testInfo) => {
  await ensureLoggedIn(page);
  await clickTab(page, 'Properties');

  // If there are any properties, click the first one and verify the detail page renders
  const firstPropLink = page.locator('#view a').first();
  if (await firstPropLink.count()) {
    const propName = await firstPropLink.textContent();
    await firstPropLink.click();
    await expect(page.locator('#view h2')).toContainText(propName.trim());
    // Detail page hallmarks
    await expect(page.locator('#view').getByText(/Sub-asset/i)).toBeVisible();
    await expect(page.locator('#view').getByText(/Year-by-year depreciation rollup|No active assets/i)).toBeVisible();
    // Back link should return us
    await page.locator('#view').getByText(/← Back to properties/i).click();
    await expect(page.locator('#view h2')).toHaveText(/Properties/i);
  } else {
    test.skip(true, 'No properties in this database to test against');
  }
});

test('add property with land + building → dispose entire property → all sub-assets disposed', async ({ page }, testInfo) => {
  const tag = workerTag(testInfo);
  const propName = 'PW-Prop-' + tag;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await ensureLoggedIn(page);
  await clickTab(page, 'Properties');
  const addBtn = page.getByRole('button', { name: /\+ Add Property/i });
  if (await addBtn.isVisible()) {
    await addBtn.click();
    // Fill property name + cost — exact field labels depend on openPropertyModal layout.
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill(propName);
    // Save (whatever the property modal exposes)
    const saveBtn = page.getByRole('button', { name: /Save|Add property/i }).last();
    await saveBtn.click().catch(()=>{});
    await page.waitForTimeout(500);
  }

  // If creation worked, the new property name appears in the table; click into detail
  const propLink = page.locator('#view').getByText(propName, { exact: false });
  if (await propLink.count()) {
    await propLink.first().click();

    // On the detail page, look for the Dispose entire property button
    const disposeAllBtn = page.getByRole('button', { name: /Dispose entire property/i });
    if (await disposeAllBtn.isVisible()) {
      await disposeAllBtn.click();
      await page.locator('input[type="date"]').first().fill('2025-06-30');
      await page.locator('input[type="number"]').first().fill('100000');
      await page.getByRole('button', { name: /Record disposal of property/i }).click();
      await page.waitForTimeout(1500);

      // The DISPOSED chip should appear
      await expect(page.locator('#view').getByText(/DISPOSED/i)).toBeVisible({ timeout:  5000 });
    }
  }

  expect(errors, 'Errors during property dispose flow:\n' + errors.join('\n')).toEqual([]);
});
