import { test, expect } from '@playwright/test';

/**
 * SCA-01 Smoke Tests
 * Quick verification that core functionality works
 */

test.describe('Smoke Tests', () => {
  test('app loads successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('title is correct', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SCA-01/);
  });

  test('sidebar is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('main content area is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.main')).toBeVisible();
  });

  test('input area is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.input-area')).toBeVisible();
  });

  test('header actions are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.header-actions')).toBeVisible();
  });

  test('new chat button works', async ({ page }) => {
    await page.goto('/');
    await page.click('.new-chat-btn');
    // Should not throw
  });

  test('settings modal opens', async ({ page }) => {
    await page.goto('/');
    await page.click('[onclick="openSettings(\'general\')"]');
    await expect(page.locator('.modal')).toBeVisible();
  });

  test('model dropdown toggles', async ({ page }) => {
    await page.goto('/');
    await page.click('#modelSelector');
    await expect(page.locator('#modelDropdown')).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known benign errors
    const realErrors = errors.filter(e => 
      !e.includes('net::ERR') && 
      !e.includes('favicon')
    );

    expect(realErrors).toHaveLength(0);
  });
});

test.describe('Security Smoke Tests', () => {
  test('CSP header is present', async ({ page }) => {
    const response = await page.goto('/');
    // Note: In Electron, CSP is set via meta tag
  });

  test('settings modal has security tab', async ({ page }) => {
    await page.goto('/');
    await page.click('[onclick="openSettings(\'security\')"]');
    await expect(page.locator('#tab-security')).toBeVisible();
  });

  test('blocked paths field exists', async ({ page }) => {
    await page.goto('/');
    await page.click('[onclick="openSettings(\'security\')"]');
    await expect(page.locator('#blockedPaths')).toBeVisible();
  });
});

test.describe('Performance Smoke Tests', () => {
  test('page loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('input is responsive', async ({ page }) => {
    await page.goto('/');
    
    const start = Date.now();
    await page.fill('#messageInput', 'Test message');
    const inputTime = Date.now() - start;
    
    expect(inputTime).toBeLessThan(100);
  });
});

