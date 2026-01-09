---
description: Ensure DeepSeek model integration and robust rate‑limit handling
---

## Workflow Overview

This workflow guides you through verifying the DeepSeek (`deepseek-coder:33b`) model integration, adjusting rate‑limit handling, persisting the model selection, monitoring logs, and deploying the built application.

### Steps

1. **Open Settings → Model Selection**
   - Manually open the app, navigate to **Settings** → **Model Selection**.
   - Verify that **deepseek‑coder:33b** is selected.

2. **Send Test Messages**
   - In the chat UI, send a few messages.
   - Observe responses; if a `429 Too Many Requests` occurs, the exponential back‑off logic should retry automatically.

3. **Adjust Rate‑Limit Parameters (if needed)**
   - Open `src/renderer/hooks/useChat.ts`.
   - Locate the constants `MAX_RETRY_ATTEMPTS` and `MAX_BACKOFF_SECONDS` (currently 5 and 30).
   - Increase them as desired, e.g., `MAX_RETRY_ATTEMPTS = 8; MAX_BACKOFF_SECONDS = 60;`.
   - Save the file.

4. **Persist Model Choice**
   - Ensure the selected model is saved in user settings (`settings.model`).
   - The UI already writes this to local storage; verify by reopening the app and confirming the selection persists.

5. **Monitor Logs**
   - Open the developer console (`Ctrl+Shift+I`).
   - Look for warnings like **"Cloud model rate‑limited"** – these indicate the fallback logic was triggered.

6. **Build the UI**

   ```
   // turbo
   npm run build:ui:dir
   ```

   - This compiles the React UI and packages the Electron app.

7. **Deploy**

   ```
   // turbo
   cp -r dist-electron/win-arm64-unpacked "C:/Deploy/@Dot Agent"
   ```

   - Copy the built folder to the target machine and run `@Dot Agent.exe`.

---

**Notes**

- The back‑off logic is implemented in `useChat.ts` via `sendWithRetry`. Adjust the constants there if you need a longer retry window.
- The workflow can be re‑run after any changes to verify the integration remains functional.
