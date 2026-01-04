import os from "node:os";
import { createConnection, type Socket } from "node:net";
import type { HyperLog } from "../logging/hyperlog.js";
import { evaluateNetworkPolicy, type PolicyContext } from "../security/policy.js";

export interface PortCheckResult {
  host: string;
  port: number;
  open: boolean;
  latency?: number;
}

export interface DnsLookupResult {
  hostname: string;
  addresses: string[];
}

export async function checkPort(
  host: string,
  port: number,
  timeout = 5000,
  ctx?: PolicyContext,
  log?: HyperLog
): Promise<PortCheckResult> {
  // Evaluate policy if context provided
  if (ctx && log) {
    const policy = evaluateNetworkPolicy(`tcp://${host}:${port}`, ctx);
    if (!policy.allowed) {
      return { host, port, open: false };
    }
  }

  return new Promise((resolve) => {
    const startTime = Date.now();

    const socket: Socket = createConnection({ host, port, timeout }, () => {
      const latency = Date.now() - startTime;
      socket.destroy();

      if (log) {
        log.info("network.port_check", `Port ${port} open on ${host}`, { latency });
      }

      resolve({ host, port, open: true, latency });
    });

    socket.on("error", () => {
      socket.destroy();
      resolve({ host, port, open: false });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ host, port, open: false });
    });
  });
}

export async function checkConnectivity(
  log?: HyperLog
): Promise<{ internet: boolean; dns: boolean; latency?: number }> {
  // Check DNS (Google's DNS)
  const dnsCheck = await checkPort("8.8.8.8", 53, 3000);

  // Check HTTP (Google)
  const httpCheck = await checkPort("google.com", 443, 5000);

  if (log) {
    log.info("network.connectivity", "Connectivity check", {
      internet: httpCheck.open,
      dns: dnsCheck.open
    });
  }

  return {
    internet: httpCheck.open,
    dns: dnsCheck.open,
    latency: httpCheck.latency ?? dnsCheck.latency
  };
}

export async function getPublicIp(
  log?: HyperLog
): Promise<{ ip?: string; error?: string }> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as { ip?: string };

    if (log) {
      log.info("network.public_ip", `Public IP: ${data.ip}`);
    }

    return { ip: data.ip };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: msg };
  }
}

export function getLocalIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;

    for (const addr of addrs) {
      if (!addr.internal && addr.family === "IPv4") {
        ips.push(addr.address);
      }
    }
  }

  return ips;
}

export async function scanPorts(
  host: string,
  ports: number[],
  ctx?: PolicyContext,
  log?: HyperLog
): Promise<PortCheckResult[]> {
  const results: PortCheckResult[] = [];

  // Check in batches of 10 to avoid overwhelming
  const batchSize = 10;

  for (let i = 0; i < ports.length; i += batchSize) {
    const batch = ports.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((port) => checkPort(host, port, 2000, ctx, log))
    );
    results.push(...batchResults);
  }

  if (log) {
    const openPorts = results.filter((r) => r.open).map((r) => r.port);
    log.info("network.port_scan", `Scanned ${ports.length} ports on ${host}`, {
      openPorts
    });
  }

  return results;
}

