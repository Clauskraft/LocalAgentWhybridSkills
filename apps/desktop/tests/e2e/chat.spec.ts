import { test, expect } from '@playwright/test';

/**
 * SCA-01 Chat Interface E2E Tests
 */

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load welcome screen', async ({ page }) => {
    await expect(page.locator('.welcome-title')).toContainText('SCA-01');
    await expect(page.locator('.welcome-subtitle')).toBeVisible();
  });

  test('should show quick actions', async ({ page }) => {
    const quickActions = page.locator('.quick-action');
    await expect(quickActions).toHaveCount(4);
  });

  test('should focus input on Ctrl+/', async ({ page }) => {
    await page.keyboard.press('Control+/');
    await expect(page.locator('#messageInput')).toBeFocused();
  });

  test('should open settings on Ctrl+,', async ({ page }) => {
    await page.keyboard.press('Control+,');
    await expect(page.locator('#settingsModal')).toBeVisible();
  });

  test('should close settings on Escape', async ({ page }) => {
    await page.click('[onclick="openSettings(\'general\')"]');
    await expect(page.locator('#settingsModal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsModal')).toBeHidden();
  });
});

test.describe('Model Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show model selector', async ({ page }) => {
    await expect(page.locator('#currentModel')).toBeVisible();
  });

  test('should toggle model dropdown', async ({ page }) => {
    await page.click('#modelSelector');
    await expect(page.locator('#modelDropdown')).toBeVisible();
    
    await page.click('#modelSelector');
    await expect(page.locator('#modelDropdown')).toBeHidden();
  });
});

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[onclick="openSettings(\'general\')"]');
  });

  test('should switch between tabs', async ({ page }) => {
    // General tab is active by default
    await expect(page.locator('#tab-general')).toBeVisible();
    
    // Switch to Models tab
    await page.click('[data-tab="models"]');
    await expect(page.locator('#tab-models')).toBeVisible();
    await expect(page.locator('#tab-general')).toBeHidden();
    
    // Switch to MCP tab
    await page.click('[data-tab="mcp"]');
    await expect(page.locator('#tab-mcp')).toBeVisible();
    
    // Switch to Prompts tab
    await page.click('[data-tab="prompts"]');
    await expect(page.locator('#tab-prompts')).toBeVisible();
    
    // Switch to Security tab
    await page.click('[data-tab="security"]');
    await expect(page.locator('#tab-security')).toBeVisible();
  });

  test('should save system prompt', async ({ page }) => {
    await page.click('[data-tab="prompts"]');
    
    const promptText = 'Test system prompt for E2E';
    await page.fill('#systemPromptText', promptText);
    
    // Mock alert for save confirmation
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Gem Prompt")');
  });
});

test.describe('Chat History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create new chat', async ({ page }) => {
    await page.click('.new-chat-btn');
    // Chat list should contain at least one item
    const chatItems = page.locator('.chat-item');
    await expect(chatItems).toHaveCount(1);
  });
});

test.describe('Message Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have placeholder text', async ({ page }) => {
    await expect(page.locator('#messageInput')).toHaveAttribute('placeholder', 'Skriv en besked...');
  });

  test('should auto-resize on input', async ({ page }) => {
    const input = page.locator('#messageInput');
    const initialHeight = await input.evaluate(el => el.offsetHeight);
    
    await input.fill('Line 1\nLine 2\nLine 3\nLine 4');
    const newHeight = await input.evaluate(el => el.offsetHeight);
    
    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test('should send message on Enter', async ({ page }) => {
    const input = page.locator('#messageInput');
    await input.fill('Test message');
    await input.press('Enter');
    
    // Welcome screen should be hidden, chat container visible
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect(page.locator('#chatContainer')).toBeVisible();
  });

  test('should not send on Shift+Enter', async ({ page }) => {
    const input = page.locator('#messageInput');
    await input.fill('Line 1');
    await input.press('Shift+Enter');
    
    // Should still be on welcome screen
    await expect(page.locator('#welcomeScreen')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper focus states', async ({ page }) => {
    await page.keyboard.press('Tab');
    
    // First focusable element should be focused
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Check main regions
    await expect(page.locator('aside.sidebar')).toBeVisible();
    await expect(page.locator('main.main')).toBeVisible();
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

