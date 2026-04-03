import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Fonthabesha/i);
  });

  test('renders the site navigation', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
  });

  test('brand link navigates to home', async ({ page }) => {
    await page.getByRole('link', { name: /Fonthabesha home/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('hero tagline is visible', async ({ page }) => {
    // The home page renders a dark hero band with an Amharic tagline
    const hero = page.locator('.home-hero');
    await expect(hero).toBeVisible();
  });

  test('at least one font card is present after load', async ({ page }) => {
    // Wait for font cards to appear (API call may be slow in CI)
    const cards = page.locator('.font-card, .font-card-list li');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('skip link appears on focus', async ({ page }) => {
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
  });

  test('footer is present', async ({ page }) => {
    const footer = page.locator('.site-footer');
    await expect(footer).toBeVisible();
  });
});
