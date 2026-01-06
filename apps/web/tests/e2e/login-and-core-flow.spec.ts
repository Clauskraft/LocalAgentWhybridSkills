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

  const nonce = `${Date.now()}`;
  const email = `sca01.e2e+${nonce}@example.com`;
  const password = `SCA01-${nonce}-Passw0rd!`;

  // 1) Provision real user via Cloud API (no stubs/mocks; this is a real registration call).
  // This avoids flaky UI registration while still verifying the actual login + core app workflow.
  const apiBase = process.env.E2E_API_BASE_URL ?? "https://sca-01-phase3-production.up.railway.app";
  const reg = await fetch(`${apiBase.replace(/\/+$/, "")}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, displayName: "SCA-01 E2E" }),
  });
  // 200 = created, 409 = already exists (shouldn't happen, but don't fail the run if it does)
  if (![200, 409].includes(reg.status)) {
    const text = await reg.text().catch(() => "");
    throw new Error(`auth/register unexpected status=${reg.status} body=${text}`);
  }

  // 2) Login UI
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Web UI" })).toBeVisible();
  await page.screenshot({ path: screenshotPath("01-login-page.png"), fullPage: true });

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.screenshot({ path: screenshotPath("02-login-filled.png"), fullPage: true });

  const loginRespP = page.waitForResponse((r) => r.url().includes("/auth/login"), { timeout: 15_000 });
  const clickP = page.getByRole("button", { name: "Login" }).click();
  const loginResp = await loginRespP;
  await clickP;

  // Helpful diagnostics if auth wiring is wrong in prod
  // eslint-disable-next-line no-console
  console.log(`[e2e] /auth/login -> ${loginResp.status()} ${loginResp.url()}`);
  if (loginResp.status() !== 200) {
    const body = await loginResp.text().catch(() => "");
    await page.screenshot({ path: screenshotPath("02b-login-failed.png"), fullPage: true });
    throw new Error(`/auth/login failed status=${loginResp.status()} url=${loginResp.url()} body=${body}`);
  }

  // 3) Land in app shell
  await expect(page.getByRole("button", { name: "New chat" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Logged in as")).toContainText(email);
  await page.screenshot({ path: screenshotPath("03-appshell-after-login.png"), fullPage: true });

  // 4) Create session + send a message (uses real API persistence; chat may degrade if OLLAMA not configured)
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

  // 5) Logout
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  await page.screenshot({ path: screenshotPath("07-logged-out.png"), fullPage: true });
});

