import { test, expect } from '@playwright/test';

/**
 * SCA-01 Chat Interface E2E Tests
 */

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load welcome screen', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('@dot');
    await expect(page.locator('text=Din lokale AI-agent')).toBeVisible();
  });

  test('should show quick actions', async ({ page }) => {
    const quickActions = page.locator('button.glass-card');
    await expect(quickActions).toHaveCount(4);
  });

  test('should focus input on Ctrl+/', async ({ page }) => {
    await page.keyboard.press('Control+/');
    await expect(page.locator('textarea')).toBeFocused();
  });

  test('should open settings on Ctrl+,', async ({ page }) => {
    await page.keyboard.press('Control+,');
    await expect(page.locator('h2:has-text("Indstillinger")')).toBeVisible();
  });

  test('should close settings on Escape', async ({ page }) => {
    await page.locator('div').filter({ hasText: /^Indstillinger$/ }).first().click();
    await expect(page.locator('h2:has-text("Indstillinger")')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('h2:has-text("Indstillinger")')).toBeHidden();
  });
});

test.describe('Model Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show model selector', async ({ page }) => {
    await expect(page.locator('text=Neural Link Active')).toBeVisible();
  });
});

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open settings via UI
    await page.locator('div').filter({ hasText: /^Indstillinger$/ }).first().click();
  });

  test('should switch between tabs', async ({ page }) => {
    // General tab is active by default
    await expect(page.locator('h3:has-text("System Konfiguration")')).toBeVisible();

    // Switch to Models tab
    await page.click('button:has-text("Modeller")');
    await expect(page.locator('h3:has-text("Installer Ny Model")')).toBeVisible();

    // Switch to MCP tab
    await page.click('button:has-text("MCP Servere")');
    await expect(page.locator('h3:has-text("Model Context Protocol")')).toBeVisible();
  });
});

test.describe('Chat History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create new chat', async ({ page }) => {
    await page.click('text=Ny samtale');
    // Chat list should contain at least one item
    const chatItems = page.locator('.item-magnetic-glow');
    await expect(chatItems).toHaveCount(1);
  });
});

test.describe('Message Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have placeholder text', async ({ page }) => {
    await expect(page.locator('textarea')).toHaveAttribute('placeholder', 'Spørg @dot om hvad som helst...');
  });

  test('should auto-resize on input', async ({ page }) => {
    const input = page.locator('textarea');
    const initialHeight = await input.evaluate(el => el.offsetHeight);

    await input.fill('Line 1\nLine 2\nLine 3\nLine 4');
    const newHeight = await input.evaluate(el => el.offsetHeight);

    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test('should send message on Enter', async ({ page }) => {
    const input = page.locator('textarea');
    await input.fill('Test message');
    await input.press('Enter');

    // Welcome screen should be hidden, chat area visible
    await expect(page.locator('h1:has-text("@dot")')).toBeHidden();
    await expect(page.locator('text=Test message')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper focus states', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('MCP Library', () => {
  test('should show MCP library in settings', async ({ page }) => {
    await page.goto('/');
    await page.click('[onclick="openSettings(\'mcp\')"]');

    await expect(page.locator('#mcpLibraryList')).toBeVisible();
  });

  test('should filter MCP servers by category', async ({ page }) => {
    await page.goto('/');
    await page.click('[onclick="openSettings(\'mcp\')"]');

    // Click filesystem category
    await page.click('[data-category="filesystem"]');

    // Should update the active button
    await expect(page.locator('[data-category="filesystem"]')).toHaveClass(/active/);
  });

  test('should search MCP servers', async ({ page }) => {
    await page.goto('/');
    await page.click('[onclick="openSettings(\'mcp\')"]');

    await page.fill('#mcpSearchInput', 'github');

    // Should show search results
    await expect(page.locator('.mcp-library-item')).toBeVisible();
  });
});

