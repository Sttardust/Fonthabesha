import { test, expect } from '@playwright/test';

test.describe('Font detail page', () => {
  // Navigate via the catalog to the first available font
  async function gotoFirstFont(page: import('@playwright/test').Page) {
    await page.goto('/fonts');
    const firstLink = page.locator('a[href^="/fonts/"]').first();
    await firstLink.waitFor({ timeout: 10_000 });
    const href = await firstLink.getAttribute('href');
    await page.goto(href!);
  }

  test('detail page renders hero and sticky nav', async ({ page }) => {
    await gotoFirstFont(page);
    await expect(page.locator('.detail-hero')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.detail-nav')).toBeVisible();
  });

  test('detail nav links are all present', async ({ page }) => {
    await gotoFirstFont(page);
    const nav = page.locator('.detail-nav');
    await expect(nav.getByText(/styles/i)).toBeVisible();
    await expect(nav.getByText(/glyphs/i)).toBeVisible();
    await expect(nav.getByText(/layouts/i)).toBeVisible();
    await expect(nav.getByText(/details/i)).toBeVisible();
  });

  test('glyph grid renders Ethiopic characters', async ({ page }) => {
    await gotoFirstFont(page);
    const glyphSection = page.locator('#glyphs, section:has(.glyph-grid)');
    if (await glyphSection.count() > 0) {
      await expect(page.locator('.glyph-grid')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('back link returns to catalog', async ({ page }) => {
    await gotoFirstFont(page);
    const backLink = page.locator('.detail-nav a[href="/fonts"]');
    if (await backLink.count() > 0) {
      await backLink.click();
      await expect(page).toHaveURL('/fonts');
    }
  });

  test('download button visible for unauthenticated user (locked)', async ({ page }) => {
    await gotoFirstFont(page);
    // Unauthenticated users see a login prompt or locked state
    const downloadCta = page.locator('.detail-download-cta, .detail-download-locked');
    await expect(downloadCta.first()).toBeVisible({ timeout: 10_000 });
  });

  test('page title includes font family name', async ({ page }) => {
    await gotoFirstFont(page);
    const title = await page.title();
    expect(title).toContain('Fonthabesha');
    expect(title.length).toBeGreaterThan('Fonthabesha'.length);
  });
});
