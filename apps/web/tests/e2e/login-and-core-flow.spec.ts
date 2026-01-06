import { test, expect } from "@playwright/test";
import path from "node:path";

function screenshotPath(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return path.join("test-results", "screenshots", `${Date.now()}-${safe}.png`);
}

test("e2e: register, login, create chat, send message (with screenshots)", async ({ page }) => {
  // Ensure no stale auth state (e.g. invalid_refresh_token) from prior runs.
  await page.addInitScript(() => {
    try {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    } catch {
      // ignore
    }
  });

  // 1) Register
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await page.screenshot({ path: screenshotPath("01-register-page.png"), fullPage: true });

  const nonce = `${Date.now()}`;
  const email = `sca01.e2e+${nonce}@example.com`;
  const password = `SCA01-${nonce}-Passw0rd!`;

  await page.getByLabel("Display name (optional)").fill("SCA-01 E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password (min 8 chars)").fill(password);
  await page.screenshot({ path: screenshotPath("02-register-filled.png"), fullPage: true });

  await page.getByRole("button", { name: "Register" }).click();

  // 2) Land in app shell
  await expect(page.getByRole("button", { name: "New chat" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Logged in as")).toContainText(email);
  await page.screenshot({ path: screenshotPath("03-appshell-after-register.png"), fullPage: true });

  // 3) Create session + send a message (uses real API persistence; chat may degrade if OLLAMA not configured)
  await page.getByRole("button", { name: "New chat" }).click();
  await page.screenshot({ path: screenshotPath("04-new-chat-clicked.png"), fullPage: true });

  const input = page.getByPlaceholder("Type a message…");
  await input.fill("ping");
  await page.screenshot({ path: screenshotPath("05-message-filled.png"), fullPage: true });

  await page.getByRole("button", { name: "Send" }).click();

  // User message should appear
  await expect(page.getByText("You")).toBeVisible();
  await expect(page.getByText("ping")).toBeVisible();

  // Assistant message should appear (either model output or Error: ...)
  await expect(page.getByText("Assistant")).toBeVisible();
  await page.screenshot({ path: screenshotPath("06-after-send.png"), fullPage: true });

  // 4) Logout
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  await page.screenshot({ path: screenshotPath("07-logged-out.png"), fullPage: true });
});

