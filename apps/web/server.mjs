import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const indexPath = path.join(distDir, "index.html");

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

/** @type {Record<string, string>} */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const cleaned = decoded.replace(/\0/g, "");
  const joined = path.normalize(path.join(distDir, cleaned));
  if (!joined.startsWith(distDir)) return distDir;
  return joined;
}

/**
 * @param {import("node:http").ServerResponse} res
 * @param {string} filePath
 */
async function sendFile(res, filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
    // Basic caching: cache assets, don't cache HTML
    if (ext === ".html") res.setHeader("Cache-Control", "no-store");
    else res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    const buf = await fs.readFile(filePath);
    res.end(buf);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    if (url === "/health") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (method !== "GET" && method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Method Not Allowed");
      return;
    }

    // Try exact file, then /index.html for directories, then SPA fallback (index.html)
    const filePath = safePath(url);
    const isServed = (await sendFile(res, filePath)) || (await sendFile(res, path.join(filePath, "index.html")));
    if (isServed) return;

    // SPA fallback
    await sendFile(res, indexPath);
  } catch {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
});

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`web-ui listening on http://${host}:${port}`);
});


