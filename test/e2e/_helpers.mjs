// Shared helpers for Playwright e2e tests. Logs in (if required), navigates,
// and provides utility selectors.
//
// Auth note: the app uses Supabase OAuth via Google. Automating that flow is
// brittle. For e2e we recommend running against a session you've already
// authenticated in by passing storage state, OR pointing at a localhost
// instance with an auth bypass build.

import { expect } from '@playwright/test';

/** Wait until the app shell is visible (post-auth). */
export async function ensureLoggedIn(page) {
  await page.goto('/');
  // If we're stuck on the login screen, the test environment isn't authed.
  const loginEl = page.locator('#login');
  const appEl = page.locator('#app');
  // Give it 3s; if neither shows, we're broken.
  const visible = await Promise.race([
    appEl.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'app'),
    loginEl.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'login'),
  ]).catch(() => 'unknown');
  if (visible === 'login') {
    throw new Error('Not authenticated — supply Playwright with a storage-state file from an authed session, or run a local auth-bypass build.');
  }
}

/** Click a sidebar tab by its visible label. */
export async function clickTab(page, label) {
  await page.locator('nav.side button.tab', { hasText: label }).click();
}

/** Open the Reports view and pick a report from the dropdown. */
export async function selectReport(page, reportLabel) {
  await clickTab(page, 'Reports');
  await page.getByRole('combobox').first().selectOption({ label: reportLabel });
}

/** Random-but-deterministic-per-worker token to namespace test data. */
export function workerTag(testInfo) {
  return 'pw-' + testInfo.parallelIndex + '-' + testInfo.workerIndex + '-' + Date.now().toString(36);
}
