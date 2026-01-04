import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function spawnInherit(cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    // On Windows, spawning .cmd shims requires a shell.
    shell: process.platform === "win32",
    env: { ...process.env, ...(opts.env ?? {}) },
    cwd: opts.cwd ?? process.cwd(),
  });
  return child;
}

function once(child, event) {
  return new Promise((resolve) => child.once(event, resolve));
}

async function runNpm(script, extraArgs = []) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawnInherit(npmCmd, ["run", script, ...extraArgs]);
  const code = await once(child, "exit");
  if (code !== 0) throw new Error(`npm run ${script} failed with exit code ${code}`);
}

async function isPortFree(host, port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, host, () => {
      srv.close(() => resolve(true));
    });
  });
}

async function findFreePort(host, start, end) {
  for (let p = start; p <= end; p++) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await isPortFree(host, p);
    if (ok) return p;
  }
  return 0;
}

async function waitForTcp(host, port, timeoutMs = 20000) {
  const started = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ok = await new Promise((resolve) => {
      const s = net.connect({ host, port });
      const done = (v) => {
        try {
          s.destroy();
        } catch {}
        resolve(v);
      };
      s.once("connect", () => done(true));
      s.once("error", () => done(false));
      s.setTimeout(500, () => done(false));
    });
    if (ok) return;
    if (Date.now() - started > timeoutMs) throw new Error(`Timed out waiting for tcp:${host}:${port}`);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 250));
  }
}

function resolveElectronBinary() {
  // electron package exports the path to the electron binary in CommonJS require()
  const electronPath = require("electron");
  if (typeof electronPath !== "string" || !electronPath) {
    throw new Error("Could not resolve electron binary path from require('electron')");
  }
  return electronPath;
}

async function main() {
  const host = "127.0.0.1";
  const port = (await findFreePort(host, 5173, 5190)) || (10240 + Math.floor(Math.random() * 20000));

  console.log(`\n🔧 dev-ui: using renderer dev server http://${host}:${port}/\n`);

  // Ensure build outputs exist before starting electron
  await runNpm("build:main");
  await runNpm("dev:preload");

  const children = [];
  const killAll = () => {
    for (const c of children) {
      try {
        c.kill("SIGTERM");
      } catch {}
    }
  };

  process.on("SIGINT", () => {
    killAll();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    killAll();
    process.exit(143);
  });

  // Watchers
  children.push(spawnInherit(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev:main"]));
  children.push(spawnInherit(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev:preload:watch"]));

  // Vite dev server
  const viteArgs = ["--config", "vite.config.ts", "--host", host, "--port", String(port)];
  children.push(spawnInherit(process.platform === "win32" ? "vite.cmd" : "vite", viteArgs, { cwd: process.cwd() }));

  // Wait for port then start electron
  await waitForTcp(host, port, 25000);

  const electronBin = resolveElectronBinary();
  children.push(
    spawnInherit(
      electronBin,
      ["."],
      {
        env: {
          VITE_DEV_SERVER_URL: `http://${host}:${port}`,
          ELECTRON_ENABLE_LOGGING: "1",
          ELECTRON_ENABLE_STACK_DUMPING: "1",
        },
      }
    )
  );

  // If any child exits non-zero, stop everything
  for (const c of children) {
    c.on("exit", (code) => {
      if (code && code !== 0) {
        console.error(`\n❌ dev-ui: child exited with code ${code}, shutting down...\n`);
        killAll();
        process.exit(code);
      }
    });
  }

  // Keep alive
  // eslint-disable-next-line no-empty
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


