import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import os from "node:os";
import type { HyperLog } from "../logging/hyperlog.js";
import {
  evaluateFileReadPolicy,
  evaluateFileWritePolicy,
  type PolicyContext
} from "../security/policy.js";
import { globalApprovalQueue } from "../approval/approvalQueue.js";

export interface FileInfo {
  path: string;
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  created: string;
  modified: string;
  accessed: string;
  permissions: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
}

export async function readFileAnywhere(
  filePath: string,
  ctx: PolicyContext,
  log: HyperLog,
  maxSize = 10_000_000
): Promise<{ content?: string; error?: string }> {
  const absPath = path.resolve(filePath);

  // Evaluate policy
  const policy = evaluateFileReadPolicy(absPath, ctx);

  log.security("file.read.policy", `File read policy: ${policy.reason}`, {
    path: absPath,
    riskLevel: policy.riskLevel,
    allowed: policy.allowed
  });

  if (!policy.allowed) {
    if (policy.requiresApproval) {
      const request = globalApprovalQueue.createRequest(
        "file_read",
        `Read file: ${absPath}`,
        policy.riskLevel,
        policy,
        { path: absPath }
      );

      const approved = await globalApprovalQueue.waitForApproval(request);
      if (!approved) {
        return { error: `File read rejected: ${absPath}` };
      }
    } else {
      return { error: policy.reason };
    }
  }

  try {
    const stat = await fs.stat(absPath);
    if (stat.size > maxSize) {
      return { error: `File too large: ${stat.size} bytes (max ${maxSize})` };
    }

    const content = await fs.readFile(absPath, { encoding: "utf8" });
    log.info("file.read", `Read file: ${absPath}`, { size: stat.size });

    return { content };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log.error("file.read.error", msg, { path: absPath });
    return { error: msg };
  }
}

export async function readFileRaw(
  absPath: string,
  log: HyperLog,
  maxSize = 10_000_000
): Promise<{ content?: string; error?: string }> {
  try {
    const stat = await fs.stat(absPath);
    if (stat.size > maxSize) {
      return { error: `File too large: ${stat.size} bytes (max ${maxSize})` };
    }

    const content = await fs.readFile(absPath, { encoding: "utf8" });
    log.info("file.read", `Read file: ${absPath}`, { size: stat.size });
    return { content };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log.error("file.read.error", msg, { path: absPath });
    return { error: msg };
  }
}

export async function writeFileAnywhere(
  filePath: string,
  content: string,
  ctx: PolicyContext,
  log: HyperLog
): Promise<{ success?: boolean; error?: string }> {
  const absPath = path.resolve(filePath);

  // Evaluate policy
  const policy = evaluateFileWritePolicy(absPath, ctx);

  log.security("file.write.policy", `File write policy: ${policy.reason}`, {
    path: absPath,
    riskLevel: policy.riskLevel,
    allowed: policy.allowed
  });

  if (!policy.allowed) {
    if (policy.requiresApproval) {
      const request = globalApprovalQueue.createRequest(
        "file_write",
        `Write file: ${absPath}`,
        policy.riskLevel,
        policy,
        { path: absPath, contentLength: content.length }
      );

      const approved = await globalApprovalQueue.waitForApproval(request);
      if (!approved) {
        return { error: `File write rejected: ${absPath}` };
      }

      log.security("file.write.approved", "Write approved", { path: absPath });
    } else {
      return { error: policy.reason };
    }
  }

  try {
    const dir = path.dirname(absPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(absPath, content, { encoding: "utf8" });

    log.info("file.write", `Wrote file: ${absPath}`, { size: content.length });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log.error("file.write.error", msg, { path: absPath });
    return { error: msg };
  }
}

export async function writeFileRaw(
  absPath: string,
  content: string,
  log: HyperLog
): Promise<{ success?: boolean; error?: string }> {
  try {
    const dir = path.dirname(absPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(absPath, content, { encoding: "utf8" });

    log.info("file.write", `Wrote file: ${absPath}`, { size: content.length });
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log.error("file.write.error", msg, { path: absPath });
    return { error: msg };
  }
}

export async function listDirectory(
  dirPath: string,
  ctx: PolicyContext,
  log: HyperLog,
  options: { recursive?: boolean; maxDepth?: number } = {}
): Promise<{ entries?: DirectoryEntry[]; error?: string }> {
  const absPath = path.resolve(dirPath);

  // Use read policy for directory listing
  const policy = evaluateFileReadPolicy(absPath, ctx);

  if (!policy.allowed) {
    if (policy.requiresApproval) {
      const request = globalApprovalQueue.createRequest(
        "file_list",
        `List directory: ${absPath}`,
        policy.riskLevel,
        policy,
        { path: absPath }
      );
      const approved = await globalApprovalQueue.waitForApproval(request);
      if (!approved) {
        return { error: `Directory listing rejected: ${absPath}` };
      }
    } else {
      return { error: policy.reason };
    }
  }

  try {
    const items = await fs.readdir(absPath, { withFileTypes: true });
    const entries: DirectoryEntry[] = [];

    for (const item of items) {
      const itemPath = path.join(absPath, item.name);
      let size = 0;

      if (item.isFile()) {
        try {
          const stat = await fs.stat(itemPath);
          size = stat.size;
        } catch {
          // ignore stat errors
        }
      }

      entries.push({
        name: item.name,
        path: itemPath,
        isFile: item.isFile(),
        isDirectory: item.isDirectory(),
        size
      });
    }

    log.info("file.list", `Listed directory: ${absPath}`, { count: entries.length });
    return { entries };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log.error("file.list.error", msg, { path: absPath });
    return { error: msg };
  }
}

export async function getFileInfo(
  filePath: string,
  ctx: PolicyContext,
  log: HyperLog
): Promise<{ info?: FileInfo; error?: string }> {
  const absPath = path.resolve(filePath);

  try {
    const stat = await fs.stat(absPath);

    const info: FileInfo = {
      path: absPath,
      exists: true,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      created: stat.birthtime.toISOString(),
      modified: stat.mtime.toISOString(),
      accessed: stat.atime.toISOString(),
      permissions: stat.mode.toString(8)
    };

    return { info };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        info: {
          path: absPath,
          exists: false,
          isFile: false,
          isDirectory: false,
          size: 0,
          created: "",
          modified: "",
          accessed: "",
          permissions: ""
        }
      };
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: msg };
  }
}

export async function searchFiles(
  dir: string,
  pattern: string,
  ctx: PolicyContext,
  log: HyperLog,
  maxResults = 100
): Promise<{ files?: string[]; error?: string }> {
  const absPath = path.resolve(dir);
  // Policy gate: searching a directory is effectively a read action over that tree.
  const policy = evaluateFileReadPolicy(absPath, ctx);
  if (!policy.allowed) {
    if (policy.requiresApproval) {
      const request = globalApprovalQueue.createRequest(
        "file_search",
        `Search files in: ${absPath}`,
        policy.riskLevel,
        policy,
        { path: absPath, pattern, maxResults }
      );
      const approved = await globalApprovalQueue.waitForApproval(request);
      if (!approved) {
        return { error: `File search rejected: ${absPath}` };
      }
    } else {
      return { error: policy.reason };
    }
  }
  const regex = new RegExp(pattern, "i");
  const results: string[] = [];

  async function search(currentDir: string, depth: number): Promise<void> {
    if (depth > 10 || results.length >= maxResults) return;

    try {
      const items = await fs.readdir(currentDir, { withFileTypes: true });

      for (const item of items) {
        if (results.length >= maxResults) break;

        const itemPath = path.join(currentDir, item.name);

        // Skip node_modules, .git, etc.
        if (item.isDirectory() && (item.name === "node_modules" || item.name === ".git")) {
          continue;
        }

        if (regex.test(item.name)) {
          results.push(itemPath);
        }

        if (item.isDirectory()) {
          await search(itemPath, depth + 1);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  try {
    await search(absPath, 0);
    log.info("file.search", `Searched files`, { dir: absPath, pattern, found: results.length });
    return { files: results };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: msg };
  }
}

