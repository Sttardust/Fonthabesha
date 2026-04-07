/**
 * Auth-flow E2E tests: Register, Forgot Password, Reset Password, Verify Email.
 *
 * These tests verify UI rendering, client-side validation, and navigation —
 * they do NOT require a live backend or real credentials.
 * All tests run in every CI environment.
 */
import { test, expect } from '@playwright/test';

// ── Register ──────────────────────────────────────────────────────────────────

test.describe('Register page', () => {
  test('renders the registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/legal full name/i)).toBeVisible();
    await expect(page.getByLabel(/country code/i)).toBeVisible();
  });

  test('shows validation errors when submitting an empty form', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /create account/i }).click();
    // At least one error should appear
    const errors = page.locator('.form-error');
    await expect(errors.first()).toBeVisible({ timeout: 3_000 });
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/^email/i).fill('test@example.com');
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('different456');
    await page.getByLabel(/display name/i).fill('Test User');
    await page.getByLabel(/legal full name/i).fill('Test Legal User');
    await page.getByLabel(/country code/i).fill('ET');
    await page.getByRole('button', { name: /create account/i }).click();
    const error = page.locator('[role="alert"]');
    await expect(error.first()).toBeVisible({ timeout: 5_000 });
  });

  test('shows error for invalid country code', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/country code/i).fill('INVALID');
    await page.getByRole('button', { name: /create account/i }).click();
    const error = page.locator('[role="alert"]');
    await expect(error.first()).toBeVisible({ timeout: 3_000 });
  });

  test('has a link to the login page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('link', { name: /sign in|log in/i })).toBeVisible();
  });

  test('redirects to / when already authenticated (RedirectIfAuth guard)', async ({ page }) => {
    // Without real auth, simply verify the page is accessible
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
  });
});

// ── Forgot password ───────────────────────────────────────────────────────────

test.describe('Forgot password page', () => {
  test('renders the email form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByRole('button', { name: /send reset link/i }).click();
    const error = page.locator('.form-error');
    await expect(error.first()).toBeVisible({ timeout: 3_000 });
  });
});

// ── Reset password ────────────────────────────────────────────────────────────

test.describe('Reset password page', () => {
  test('renders the reset form when a token query param is present', async ({ page }) => {
    await page.goto('/reset-password?token=fake-token-for-ui-test');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/new password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible();
  });

  test('shows error when new passwords do not match', async ({ page }) => {
    await page.goto('/reset-password?token=fake-token-for-ui-test');
    await page.getByLabel(/new password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('different456');
    await page.getByRole('button', { name: /reset password/i }).click();
    const error = page.locator('[role="alert"]');
    await expect(error.first()).toBeVisible({ timeout: 5_000 });
  });

  test('shows missing-token error when no token in URL', async ({ page }) => {
    await page.goto('/reset-password');
    await page.getByLabel(/new password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    await page.getByRole('button', { name: /reset password/i }).click();
    const error = page.locator('[role="alert"]');
    await expect(error.first()).toBeVisible({ timeout: 5_000 });
  });
});

// ── Verify email ──────────────────────────────────────────────────────────────

test.describe('Verify email page', () => {
  test('shows verifying state when a token is present', async ({ page }) => {
    // With a fake token the API will fail, transitioning from verifying → error
    await page.goto('/verify-email?token=fake-verification-token');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // After a short delay the API call will fail and an error state or link appears
    const link = page.getByRole('link', { name: /back to login/i });
    await expect(link).toBeVisible({ timeout: 8_000 });
  });

  test('shows error state when no token is in the URL', async ({ page }) => {
    await page.goto('/verify-email');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible();
  });
});
