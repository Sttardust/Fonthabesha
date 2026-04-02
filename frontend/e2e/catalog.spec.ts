import { test, expect } from '@playwright/test';

test.describe('Fonts catalog page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fonts');
  });

  test('renders the filter bar', async ({ page }) => {
    await expect(page.locator('.filter-bar')).toBeVisible();
  });

  test('search input updates URL param', async ({ page }) => {
    const search = page.getByPlaceholder(/search/i);
    await search.fill('Abyssinica');
    // Debounce or change — wait for URL to update
    await page.waitForURL(/q=Abyssinica/, { timeout: 5_000 });
    await expect(page).toHaveURL(/q=Abyssinica/);
  });

  test('clicking a category chip filters by that category', async ({ page }) => {
    const serifChip = page.locator('.filter-item').filter({ hasText: /serif/i }).first();
    await serifChip.click();
    await expect(page).toHaveURL(/cat=serif/);
  });

  test('clicking variable toggle adds isVariable filter', async ({ page }) => {
    const varToggle = page.locator('.filter-item').filter({ hasText: /variable/i });
    await varToggle.click();
    await expect(page).toHaveURL(/var=1/);
  });

  test('"Your text" input updates specimen text on all cards', async ({ page }) => {
    // Wait for cards to load
    await page.locator('.font-card, .font-card-list li').first().waitFor({ timeout: 10_000 });

    const yourText = page.getByPlaceholder(/type something/i);
    await yourText.fill('Test');
    // Specimen areas should now contain "Test"
    const specimens = page.locator('.specimen-area');
    await expect(specimens.first()).toContainText('Test', { timeout: 3_000 });
  });

  test('grid view toggle switches layout', async ({ page }) => {
    const gridBtn = page.locator('[aria-label="Grid view"], [title="Grid view"]').first();
    if (await gridBtn.count() > 0) {
      await gridBtn.click();
      await expect(page).toHaveURL(/view=grid/);
    }
  });

  test('reset button clears all filters', async ({ page }) => {
    // Apply a filter first
    const serifChip = page.locator('.filter-item').filter({ hasText: /serif/i }).first();
    await serifChip.click();
    await expect(page).toHaveURL(/cat=serif/);

    const resetBtn = page.getByRole('button', { name: /reset/i });
    await resetBtn.click();
    await expect(page).not.toHaveURL(/cat=/);
  });

  test('pagination controls are accessible', async ({ page }) => {
    const prev = page.getByRole('button', { name: /previous/i });
    const next  = page.getByRole('button', { name: /next/i });
    // Previous should be disabled on page 1
    if (await prev.count() > 0) {
      await expect(prev).toBeDisabled();
    }
    if (await next.count() > 0) {
      await expect(next).toBeEnabled();
    }
  });
});
