/**
 * Accessibility E2E tests.
 * Verifies keyboard navigation, ARIA landmarks, skip links, and
 * focus management across key pages.
 */
import { test, expect } from '@playwright/test';

test.describe('Accessibility — keyboard navigation', () => {
  test('skip link targets #main-content and focuses it', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    const main = page.locator('#main-content');
    await expect(main).toBeFocused();
  });

  test('navigation is reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    // Tab past skip link to reach nav
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // first nav item (brand)
    const focused = page.locator(':focus');
    // Should be inside the nav
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toContainElement(focused);
  });

  test('mobile hamburger button has correct ARIA attributes', async ({ page, viewport }) => {
    // Simulate mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const hamburger = page.locator('.site-nav__hamburger');
    if (await hamburger.isVisible()) {
      await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
      await expect(hamburger).toHaveAttribute('aria-label', /open navigation/i);
      await hamburger.click();
      await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
      await expect(hamburger).toHaveAttribute('aria-label', /close navigation/i);
    }
  });

  test('Escape closes the mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const hamburger = page.locator('.site-nav__hamburger');
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await expect(page.locator('.mobile-nav--open')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.mobile-nav--open')).not.toBeVisible();
    }
  });

  test('page has a main landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main#main-content')).toBeVisible();
  });

  test('fonts page has no orphaned interactive elements without labels', async ({ page }) => {
    await page.goto('/fonts');
    // All buttons should have accessible names
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const name = await btn.getAttribute('aria-label') ??
                     await btn.textContent();
        expect(name?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  test('404 page renders with correct heading', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz');
    await expect(page.getByRole('heading')).toContainText(/404|not found/i);
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
  });

  test('login form labels are associated with inputs', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.getByLabel(/email/i);
    const passInput  = page.getByLabel(/password/i);
    await expect(emailInput).toBeVisible();
    await expect(passInput).toBeVisible();
  });
});
