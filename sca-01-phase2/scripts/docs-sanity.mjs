import fs from "node:fs";
import path from "node:path";

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listMarkdownFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Keep the scope tight (Phase2 docs only)
        stack.push(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        out.push(full);
      }
    }
  }
  return out;
}

function extractNpmRunScripts(text) {
  // Captures: npm run <script> [-- ...]
  const re = /\bnpm\s+run\s+([a-zA-Z0-9:_-]+)\b/g;
  const scripts = new Set();
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) scripts.add(m[1]);
  }
  return Array.from(scripts);
}

function extractBacktickedPaths(text) {
  // Conservative: only backticked strings that look like relative paths we own.
  const re = /`([^`]+)`/g;
  const paths = new Set();
  let m;
  while ((m = re.exec(text))) {
    const raw = (m[1] ?? "").trim();
    if (!raw) continue;
    // Ignore multiline code blocks / tree diagrams accidentally captured by the backtick regex.
    if (raw.includes("\n")) continue;
    // Ignore box-drawing directory trees (often shown inside backticks in docs).
    if (raw.includes("├") || raw.includes("└") || raw.includes("│")) continue;
    if (raw.startsWith("http://") || raw.startsWith("https://")) continue;
    if (raw.includes("\\")) continue; // avoid Windows path examples
    if (!raw.includes("/")) continue;
    if (raw.startsWith("./")) continue; // allow but don't validate (can be ambiguous)
    if (raw.startsWith("../")) continue; // don't validate outside phase2
    // Ignore build/dist artifacts (may not exist pre-build).
    if (raw.startsWith("build/") || raw.startsWith("dist/") || raw.startsWith("dist-electron/")) continue;
    // Ignore files that are intentionally user-created at runtime.
    if (raw === "config/integrations.json") continue;
    // Only validate things that look like files (have extension) or docs paths.
    if (/\.[a-z0-9]+$/i.test(raw) || raw.startsWith("docs/")) paths.add(raw);
  }
  return Array.from(paths);
}

function main() {
  const phase2Root = process.cwd();
  const pkgPath = path.join(phase2Root, "package.json");
  const pkg = readJson(pkgPath);
  const scripts = pkg.scripts ?? {};

  const mdFiles = [
    path.join(phase2Root, "README.md"),
    ...listMarkdownFiles(path.join(phase2Root, "docs")),
  ].filter((p) => fs.existsSync(p));

  const errors = [];

  for (const file of mdFiles) {
    const rel = path.relative(phase2Root, file).replaceAll("\\", "/");
    const text = fs.readFileSync(file, "utf8");

    for (const s of extractNpmRunScripts(text)) {
      if (!(s in scripts)) {
        errors.push(`${rel}: references \`npm run ${s}\` but script is missing from package.json`);
      }
    }

    for (const p of extractBacktickedPaths(text)) {
      const resolved = path.join(phase2Root, p);
      if (!fs.existsSync(resolved)) {
        errors.push(`${rel}: references \`${p}\` but path does not exist in Phase 2 package`);
      }
    }
  }

  // Prevent drift on WidgetDC env var naming (historical confusion).
  const envDoc = path.join(phase2Root, "docs", "ENVIRONMENT_VARIABLES.md");
  if (fs.existsSync(envDoc)) {
    const envText = fs.readFileSync(envDoc, "utf8");
    if (envText.includes("WIDGETDC_CLOUDFLARE_WORKER_URL")) {
      errors.push(
        `docs/ENVIRONMENT_VARIABLES.md: contains WIDGETDC_CLOUDFLARE_WORKER_URL but code expects WIDGETDC_WORKER_URL`
      );
    }
  }

  if (errors.length) {
    console.error("Docs sanity check failed:\n");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log(`Docs sanity check passed (${mdFiles.length} markdown files scanned).`);
}

main();


