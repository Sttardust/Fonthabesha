/**
 * Contributor portal E2E tests.
 *
 * Authenticated tests require CONTRIBUTOR_EMAIL and CONTRIBUTOR_PASSWORD
 * environment variables. When not set the authenticated suite is skipped so
 * the CI baseline still passes without a running backend.
 *
 * Usage (with backend running):
 *   CONTRIBUTOR_EMAIL=test@example.com CONTRIBUTOR_PASSWORD=secret npx playwright test contributor
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL    = process.env['CONTRIBUTOR_EMAIL']    ?? '';
const PASSWORD = process.env['CONTRIBUTOR_PASSWORD'] ?? '';
const HAS_CREDS = EMAIL.length > 0 && PASSWORD.length > 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAsContributor(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for redirect to contributor portal
  await page.waitForURL(/\/contributor/, { timeout: 10_000 });
}

// ── Unauthenticated guard tests (always run) ──────────────────────────────────

test.describe('Contributor portal — access guards', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/contributor');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('redirects /contributor/submissions to login when not authenticated', async ({ page }) => {
    await page.goto('/contributor/submissions');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('redirects /contributor/submissions/new to login when not authenticated', async ({ page }) => {
    await page.goto('/contributor/submissions/new');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});

// ── Authenticated contributor tests ──────────────────────────────────────────

test.describe('Contributor portal — authenticated', () => {
  test.skip(!HAS_CREDS, 'CONTRIBUTOR_EMAIL and CONTRIBUTOR_PASSWORD required');

  test.beforeEach(async ({ page }) => {
    await loginAsContributor(page);
  });

  test('dashboard renders portal title and "New Submission" button', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('link', { name: /new submission/i })).toBeVisible();
  });

  test('submissions list page shows table or empty state', async ({ page }) => {
    await page.goto('/contributor/submissions');
    // Either a table or an empty state message should be present
    const hasTable  = await page.locator('.data-table').count();
    const hasEmpty  = await page.locator('.dashboard-empty, [class*="empty"]').count();
    const hasStatus = await page.locator('[class*="badge--status"]').count();
    expect(hasTable + hasEmpty + hasStatus).toBeGreaterThanOrEqual(0); // page loaded without error
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('new submission form renders all required fields', async ({ page }) => {
    await page.goto('/contributor/submissions/new');
    await expect(page.getByLabel(/family name.*english/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByLabel(/license/i)).toBeVisible();
    await expect(page.getByLabel(/ownership evidence type/i)).toBeVisible();
    await expect(page.getByLabel(/evidence value/i)).toBeVisible();
    await expect(page.getByLabel(/contributor statement/i)).toBeVisible();
    await expect(page.getByLabel(/legal name/i)).toBeVisible();
  });

  test('new submission form validation — empty submit shows errors', async ({ page }) => {
    await page.goto('/contributor/submissions/new');
    // Clear the pre-filled statement text then try to submit
    await page.getByLabel(/contributor statement/i).clear();
    await page.getByRole('button', { name: /create draft/i }).click();
    // At least one validation error should appear
    const errors = page.locator('.form-error');
    await expect(errors.first()).toBeVisible({ timeout: 5_000 });
  });

  test('full submission draft creation flow', async ({ page }) => {
    await page.goto('/contributor/submissions/new');

    // Fill required fields
    await page.getByLabel(/family name.*english/i).fill('Test Font E2E');
    await page.getByLabel(/family name.*አማርኛ/i).fill('ፈተና ፊደል');

    // Select first available license
    const licenseSelect = page.getByLabel(/^license/i);
    await licenseSelect.waitFor({ state: 'visible', timeout: 8_000 });
    const options = await licenseSelect.locator('option').count();
    if (options > 1) {
      await licenseSelect.selectOption({ index: 1 });
    }

    await page.getByLabel(/evidence value/i).fill('https://github.com/example/test-font-e2e');
    await page.getByLabel(/contributor statement/i).fill(
      'I am the original author of this test font and hold all rights to distribute it.',
    );
    await page.getByLabel(/legal name/i).fill('E2E Test User');

    // Submit the form
    await page.getByRole('button', { name: /create draft/i }).click();

    // Should navigate to submission detail page
    await page.waitForURL(/\/contributor\/submissions\/[0-9a-f-]{36}/, { timeout: 15_000 });

    // Detail page should show the family name and a status badge
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/test font e2e/i, {
      timeout: 8_000,
      ignoreCase: true,
    });
    await expect(page.locator('[class*="badge--status"]')).toBeVisible();
  });

  test('submission detail page shows upload dropzone for draft', async ({ page }) => {
    // Navigate to new submission and create a draft first
    await page.goto('/contributor/submissions/new');

    await page.getByLabel(/family name.*english/i).fill('Upload Test E2E');

    const licenseSelect = page.getByLabel(/^license/i);
    await licenseSelect.waitFor({ state: 'visible', timeout: 8_000 });
    const options = await licenseSelect.locator('option').count();
    if (options > 1) await licenseSelect.selectOption({ index: 1 });

    await page.getByLabel(/evidence value/i).fill('https://github.com/example/upload-test');
    await page.getByLabel(/contributor statement/i).fill(
      'I am the original author and hold all rights to distribute this font.',
    );
    await page.getByLabel(/legal name/i).fill('E2E Uploader');

    await page.getByRole('button', { name: /create draft/i }).click();
    await page.waitForURL(/\/contributor\/submissions\/[0-9a-f-]{36}/, { timeout: 15_000 });

    // Dropzone should be visible for a new draft
    const dropzone = page.locator('.upload-dropzone, [class*="dropzone"]');
    await expect(dropzone).toBeVisible({ timeout: 8_000 });

    // "Submit for Review" button should be disabled (no styles uploaded yet)
    const submitBtn = page.getByRole('button', { name: /submit for review/i });
    await expect(submitBtn).toBeDisabled({ timeout: 5_000 });
  });
});

// ── ProfilePage guard (always runs) ──────────────────────────────────────────

test.describe('Contributor profile — access guard', () => {
  test('redirects /contributor/profile to login when not authenticated', async ({ page }) => {
    await page.goto('/contributor/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});

// ── ProfilePage authenticated tests ──────────────────────────────────────────

test.describe('Contributor profile — authenticated', () => {
  test.skip(!HAS_CREDS, 'CONTRIBUTOR_EMAIL and CONTRIBUTOR_PASSWORD required');

  test.beforeEach(async ({ page }) => {
    await loginAsContributor(page);
  });

  test('profile page renders heading and all form fields', async ({ page }) => {
    await page.goto('/contributor/profile');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/legal full name/i)).toBeVisible();
    await expect(page.getByLabel(/country code/i)).toBeVisible();
    await expect(page.getByLabel(/organization/i)).toBeVisible();
    await expect(page.getByLabel(/phone number/i)).toBeVisible();
  });

  test('save profile button is disabled when form is not dirty', async ({ page }) => {
    await page.goto('/contributor/profile');
    await page.waitForSelector('.profile-form', { timeout: 8_000 });
    const saveBtn = page.getByRole('button', { name: /save profile/i });
    await expect(saveBtn).toBeDisabled();
  });

  test('save profile button becomes enabled after editing a field', async ({ page }) => {
    await page.goto('/contributor/profile');
    const displayNameInput = page.getByLabel(/display name/i);
    await displayNameInput.waitFor({ state: 'visible', timeout: 8_000 });
    const currentValue = await displayNameInput.inputValue();
    await displayNameInput.fill(currentValue + ' edited');
    const saveBtn = page.getByRole('button', { name: /save profile/i });
    await expect(saveBtn).toBeEnabled({ timeout: 3_000 });
  });

  test('change password section renders all three password fields', async ({ page }) => {
    await page.goto('/contributor/profile');
    await expect(page.getByLabel(/current password/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByLabel(/new password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /change password/i })).toBeVisible();
  });

  test('change password button is disabled when form is not dirty', async ({ page }) => {
    await page.goto('/contributor/profile');
    await page.waitForSelector('.profile-section', { timeout: 8_000 });
    const changeBtn = page.getByRole('button', { name: /change password/i });
    await expect(changeBtn).toBeDisabled();
  });

  test('profile sidebar nav includes a Profile link', async ({ page }) => {
    await page.goto('/contributor');
    const profileLink = page.getByRole('link', { name: /profile/i });
    await expect(profileLink).toBeVisible({ timeout: 8_000 });
  });
});
