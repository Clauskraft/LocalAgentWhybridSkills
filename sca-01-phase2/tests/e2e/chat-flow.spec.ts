import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || '';

test.describe('Chat Flow (cloud backend, no mocks)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!BACKEND_URL, 'BACKEND_URL is not set; cannot run real chat flow');
    await page.goto('/');
  });

  test('send message via cloud backend and receive assistant response', async ({ page }) => {
    // Open settings (General tab is default)
    await page.click('[data-tab="general"], [onclick="openSettings(\'general\')"]', { trial: true }).catch(async () => {
      // Fallback: open settings button if nav selector missing
      const settingsBtn = page.locator('button:has-text("Indstillinger"), .header-btn:has-text("MCP")').first();
      if (await settingsBtn.count()) {
        await settingsBtn.click();
      } else {
        // If modal already open, continue
      }
    });
    // Ensure modal is visible (if not already)
    if (!(await page.locator('.modal').isVisible())) {
      await page.click('.header-btn:has-text("MCP")').catch(() => {});
      await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });
    }

    // Fill backend URL
    const backendInput = page.locator('input[placeholder*="Railway"]').first();
    await backendInput.fill(BACKEND_URL);

    // Enable cloud preference
    const cloudToggle = page.locator('label:has-text("Foretræk cloud-model") input[type="checkbox"]');
    if (!(await cloudToggle.isChecked())) {
      await cloudToggle.check();
    }

    // Close settings (X button)
    await page.locator('.modal-close').click({ timeout: 2000 });
    await expect(page.locator('.modal')).toBeHidden({ timeout: 5000 });

    // Send a message
    const input = page.locator('#messageInput');
    await input.fill('Hej, bekræft at du kører via cloud backend.');
    await input.press('Enter');

    // Wait for assistant message (non-empty)
    const assistantMessage = page.locator('.message').filter({
      has: page.locator('.message-role', { hasText: 'SCA-01' }),
    }).last();

    await expect(assistantMessage).toBeVisible({ timeout: 30000 });
    const text = await assistantMessage.locator('.message-text').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

