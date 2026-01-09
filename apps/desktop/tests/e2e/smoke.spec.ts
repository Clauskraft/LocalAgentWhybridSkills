import { test, expect } from '@playwright/test';

/**
 * SCA-01 Smoke Tests
 * Quick verification that core functionality works
 */

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const base = String((testInfo.project.use as any)?.baseURL ?? 'http://localhost:3000').replace(/\/+$/, '');
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('#root', { state: 'attached', timeout: 30_000 });
  });

  test('app loads successfully', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/@dot/);
  });

  test('sidebar is visible', async ({ page }) => {
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.getByText('Ny samtale', { exact: true })).toBeVisible();
  });

  test('input area is visible', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="Spørg @dot"]');
    await expect(input).toBeVisible();
  });

  test('header actions are visible', async ({ page }) => {
    await expect(page.getByText(/Neural Link/i)).toBeVisible();
  });

  test('new chat button works', async ({ page }) => {
    await page.getByText('Ny samtale', { exact: true }).click();
  });

  test('settings modal opens', async ({ page }) => {
    await page.locator('div').filter({ hasText: /^Indstillinger$/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Indstillinger' })).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e =>
      !e.includes('net::ERR') &&
      !e.includes('favicon')
    );
    expect(realErrors).toHaveLength(0);
  });
});

test.describe('Security Smoke Tests', () => {
  test('settings modal has security tab', async ({ page }) => {
    await page.goto('/');
    await page.locator('div').filter({ hasText: /^Indstillinger$/ }).first().click();
    await page.getByRole('button', { name: /System/i }).click(); // 'system' tab contains security/restore
    await expect(page.getByText('System Control', { exact: true })).toBeVisible();
  });
});

test.describe('Performance Smoke Tests', () => {
  test('page loads within reasonable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(15000);
  });

  test('input is responsive', async ({ page }) => {
    await page.goto('/');
    const start = Date.now();
    await page.locator('textarea[placeholder*="Spørg @dot"]').fill('Test message');
    const inputTime = Date.now() - start;
    expect(inputTime).toBeLessThan(3000);
  });
});

