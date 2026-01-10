// packages/mcp-client/src/HarvestMcpClient.ts
/**
 * HarvestMcpClient – typed wrapper around the MCP "harvest" tool suite.
 *
 * Communicates with an MCP server (default http://localhost:3001) via JSON‑RPC over HTTP.
 * Each method maps 1:1 to an MCP tool registered in the backend (see
 * `claudedocs/HARVEST_MCP_TOOLS_REFERENCE.md`).
 */

import { EventSource } from 'eventsource';
import {
    StatusResponse,
    OsintResponse,
    ScribdResponse,
    SharePointResponse,
    EventMessage,
    CrawlWebResponse,
    ScrapeWebResponse,
    RepoGitResponse,
    RepoGitHubResponse,
    SlideShareResponse,
    ShowpadResponse,
    CloudM365Response,
    CloudRemarkableResponse,
    EmailIntelResponse,
    ScanDomainResponse,
    ExtractKnowledgeResponse,
    FolketingetResponse,
} from './types';

export interface HarvestClientOptions {
    /** Base URL of the MCP server, e.g. "http://localhost:3001" */
    baseUrl?: string;
    /** Optional request timeout in milliseconds */
    timeoutMs?: number;
}

function buildUrl(base: string, path: string): string {
    const trimmed = base.replace(/\/*$/, '');
    const p = path.replace(/^\/*/, '');
    return `${trimmed}/${p}`;
}

async function callTool<T>(baseUrl: string, tool: string, args: Record<string, any> = {}): Promise<T> {
    const url = buildUrl(baseUrl, `/tool/${tool}`);
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arguments: args }),
    });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`MCP tool ${tool} failed ${resp.status}: ${txt}`);
    }
    const json = (await resp.json()) as { content: T };
    return json.content;
}

export class HarvestMcpClient {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;

    constructor(options: HarvestClientOptions = {}) {
        this.baseUrl = options.baseUrl ?? 'http://localhost:3001';
        this.timeoutMs = options.timeoutMs ?? 30_000;
    }

    // Status & meta
    async getStatus(): Promise<StatusResponse> {
        return callTool<StatusResponse>(this.baseUrl, 'harvest.status');
    }
    async getClakStats(): Promise<any> {
        return callTool<any>(this.baseUrl, 'clak.stats');
    }
    async getAutonomousStatus(): Promise<any> {
        return callTool<any>(this.baseUrl, 'autonomous.status');
    }

    // Web harvesting
    async crawlWeb(params: { url: string; depth?: number }): Promise<CrawlWebResponse> {
        return callTool<CrawlWebResponse>(this.baseUrl, 'harvest.web.crawl', params);
    }
    async scrapeWeb(params: { url: string; selector?: string }): Promise<ScrapeWebResponse> {
        return callTool<ScrapeWebResponse>(this.baseUrl, 'harvest.web.scrape', params);
    }

    // Repository harvesting
    async harvestGit(params: { repoUrl: string }): Promise<RepoGitResponse> {
        return callTool<RepoGitResponse>(this.baseUrl, 'harvest.repo.git', params);
    }
    async harvestGitHub(params: { owner: string; repo: string }): Promise<RepoGitHubResponse> {
        return callTool<RepoGitHubResponse>(this.baseUrl, 'harvest.repo.github', params);
    }

    // Document harvesting
    async harvestScribd(params: { maxDocuments?: number }): Promise<ScribdResponse> {
        return callTool<ScribdResponse>(this.baseUrl, 'harvest.docs.scribd', params);
    }
    async harvestSlideShare(params: { maxDocuments?: number }): Promise<SlideShareResponse> {
        return callTool<SlideShareResponse>(this.baseUrl, 'harvest.docs.slideshare', params);
    }
    async harvestSharePoint(params: { siteUrl: string }): Promise<SharePointResponse> {
        return callTool<SharePointResponse>(this.baseUrl, 'harvest.docs.sharepoint', params);
    }
    async harvestShowpad(params: { maxDocuments?: number }): Promise<ShowpadResponse> {
        return callTool<ShowpadResponse>(this.baseUrl, 'harvest.docs.showpad', params);
    }

    // Cloud services
    async harvestM365(params: { tenantId: string }): Promise<CloudM365Response> {
        return callTool<CloudM365Response>(this.baseUrl, 'harvest.cloud.m365', params);
    }
    async harvestRemarkable(params: { deviceId: string }): Promise<CloudRemarkableResponse> {
        return callTool<CloudRemarkableResponse>(this.baseUrl, 'harvest.cloud.remarkable', params);
    }

    // Intelligence / OSINT
    async harvestEmailIntel(params: { mailbox: string }): Promise<EmailIntelResponse> {
        return callTool<EmailIntelResponse>(this.baseUrl, 'harvest.intel.email', params);
    }
    async runOsint(params: { target: string }): Promise<OsintResponse> {
        return callTool<OsintResponse>(this.baseUrl, 'harvest.intel.osint', params);
    }
    async scanDomain(params: { domain: string }): Promise<ScanDomainResponse> {
        return callTool<ScanDomainResponse>(this.baseUrl, 'harvest.intel.domain', params);
    }
    async extractKnowledge(params: { query: string }): Promise<ExtractKnowledgeResponse> {
        return callTool<ExtractKnowledgeResponse>(this.baseUrl, 'harvest.intel.knowledge', params);
    }

    // Government data sources
    async harvestFolketinget(params: { query?: string }): Promise<FolketingetResponse> {
        return callTool<FolketingetResponse>(this.baseUrl, 'harvest.gov.folketinget', params);
    }

    // Event handling (SSE)
    /** Subscribe to the MCP SSE stream. */
    subscribeToEvents(onEvent: (event: EventMessage) => void, onError?: (err: any) => void): () => void {
        const url = buildUrl(this.baseUrl, '/events');
        const es = new EventSource(url);
        es.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data) as EventMessage;
                onEvent(data);
            } catch (e) {
                onError?.(e);
            }
        };
        es.onerror = (err) => {
            onError?.(err);
        };
        return () => es.close();
    }
}

export function createHarvestClient(opts: HarvestClientOptions = {}): HarvestMcpClient {
    return new HarvestMcpClient(opts);
}
