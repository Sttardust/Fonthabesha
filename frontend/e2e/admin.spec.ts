/**
 * Admin / reviewer portal E2E tests.
 *
 * Authenticated tests require ADMIN_EMAIL and ADMIN_PASSWORD environment
 * variables. Without them the authenticated suite is skipped so the CI
 * baseline passes without a running backend.
 *
 * Usage (with backend running):
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret npx playwright test admin
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL    = process.env['ADMIN_EMAIL']    ?? '';
const PASSWORD = process.env['ADMIN_PASSWORD'] ?? '';
const HAS_CREDS = EMAIL.length > 0 && PASSWORD.length > 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 10_000 });
}

// ── Unauthenticated guard tests (always run) ──────────────────────────────────

test.describe('Admin portal — access guards', () => {
  test('redirects /admin to login when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('redirects /admin/review to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/review');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('redirects /admin/analytics to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/analytics');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});

// ── Authenticated admin tests ─────────────────────────────────────────────────

test.describe('Admin portal — authenticated', () => {
  test.skip(!HAS_CREDS, 'ADMIN_EMAIL and ADMIN_PASSWORD required');

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('dashboard renders heading and stat cards', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8_000 });
    const statCards = page.locator('.stat-card');
    await expect(statCards.first()).toBeVisible({ timeout: 8_000 });
  });

  test('dashboard stat cards show numeric values', async ({ page }) => {
    const statValues = page.locator('.stat-card__value');
    await expect(statValues.first()).toBeVisible({ timeout: 8_000 });
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('review queue page renders status filter chips and table or empty state', async ({ page }) => {
    await page.goto('/admin/review');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8_000 });
    // Filter chips should always be present
    const chips = page.locator('.filter-chips .filter-item');
    await expect(chips.first()).toBeVisible();
    // Either a table or empty state
    const hasTable = await page.locator('.data-table').count();
    const hasEmpty = await page.locator('.dashboard-empty').count();
    expect(hasTable + hasEmpty).toBeGreaterThan(0);
  });

  test('review queue status filter chips are clickable and update active state', async ({ page }) => {
    await page.goto('/admin/review');
    const needsReviewChip = page
      .locator('.filter-chips .filter-item')
      .filter({ hasText: /needs review/i });
    await expect(needsReviewChip).toBeVisible({ timeout: 8_000 });
    await needsReviewChip.click();
    await expect(needsReviewChip).toHaveClass(/filter-item--active/);
  });

  test('sidebar navigation links are all accessible', async ({ page }) => {
    const sidebar = page.locator('.portal-sidebar');
    await expect(sidebar).toBeVisible({ timeout: 8_000 });
    const navLinks = sidebar.getByRole('link');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(3); // dashboard, review, analytics at minimum
  });

  test('analytics page renders period selector and stat grid', async ({ page }) => {
    await page.goto('/admin/analytics');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8_000 });

    // Period selector buttons (7 days, 30 days, 90 days)
    const periodBtns = page.locator('[aria-label="Date range"] button');
    await expect(periodBtns).toHaveCount(3, { timeout: 5_000 });

    // Stat cards should appear after data loads
    await expect(page.locator('.stat-card').first()).toBeVisible({ timeout: 10_000 });
  });

  test('analytics page period switch reloads data without error', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.locator('.stat-card').first().waitFor({ timeout: 10_000 });

    // Click the "7 days" range
    const sevenDayBtn = page
      .locator('[aria-label="Date range"] button')
      .filter({ hasText: '7 days' });
    await sevenDayBtn.click();
    await expect(sevenDayBtn).toHaveAttribute('aria-pressed', 'true');
    // No error message should appear
    await expect(page.locator('.catalog-status--error')).not.toBeVisible({ timeout: 5_000 });
  });

  test('review detail page renders two-column layout when navigating to a review', async ({
    page,
  }) => {
    await page.goto('/admin/review');
    // If there are reviews in the queue, navigate to the first one
    const reviewLink = page
      .locator('.data-table tbody tr td a, .data-table tbody tr td .btn')
      .first();
    if (await reviewLink.count() > 0) {
      await reviewLink.click();
      await page.waitForURL(/\/admin\/review\/[0-9a-f-]{36}/, { timeout: 10_000 });

      // Two-column review layout should be present
      await expect(page.locator('.review-detail-main, .review-detail-aside')).toBeVisible({
        timeout: 8_000,
      });

      // Action buttons should be visible
      await expect(page.getByRole('button', { name: /approve/i })).toBeVisible({ timeout: 5_000 });
      await expect(page.getByRole('button', { name: /reject/i })).toBeVisible();
    }
  });

  test('approve action opens confirm dialog with notes field', async ({ page }) => {
    await page.goto('/admin/review');
    const reviewLink = page
      .locator('.data-table tbody tr td a, .data-table tbody tr td .btn')
      .first();
    if (await reviewLink.count() > 0) {
      await reviewLink.click();
      await page.waitForURL(/\/admin\/review\/[0-9a-f-]{36}/, { timeout: 10_000 });

      const approveBtn = page.getByRole('button', { name: /approve/i });
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
        // Confirm dialog should appear
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5_000 });
        // Cancel to avoid actually approving
        const cancelBtn = dialog.getByRole('button', { name: /cancel/i });
        if (await cancelBtn.isVisible()) await cancelBtn.click();
        await expect(dialog).not.toBeVisible({ timeout: 3_000 });
      }
    }
  });
});
