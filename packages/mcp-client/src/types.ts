// packages/mcp-client/src/types.ts
/**
 * Typed responses for the Harvest MCP client.
 * Only a subset of tools is fully typed here – you can extend the list
 * as new tools are added.
 */

export interface StatusResponse {
    uptimeSeconds: number;
    version: string;
    healthy: boolean;
}

export interface OsintResponse {
    target: string;
    indicators: Array<{ type: string; value: string }>; // e.g. IP, domain, hash
    confidence: number; // 0‑1
}

export interface ScribdResponse {
    documents: Array<{
        id: string;
        title: string;
        url: string;
        createdAt: string;
    }>;
    total: number;
}

export interface SharePointResponse {
    items: Array<{
        id: string;
        name: string;
        url: string;
        modified: string;
    }>;
    count: number;
}

export interface EventMessage {
    type: string;
    data: any;
    timestamp: string;
}
