
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server(
    {
        name: "mcp-microsoft",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Placeholder for Azure Auth
const MS_CONFIG = {
    tenantId: process.env.MS_TENANT_ID || "",
    clientId: process.env.MS_CLIENT_ID || "",
    clientSecret: process.env.MS_CLIENT_SECRET || "",
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "graph_query",
                description: "Execute a read-only query against Microsoft Graph API",
                inputSchema: {
                    type: "object",
                    properties: {
                        endpoint: {
                            type: "string",
                            description: "Graph API endpoint (e.g. /me, /users)",
                        },
                    },
                    required: ["endpoint"],
                },
            },
            {
                name: "power_platform_status",
                description: "Check connectivity to Power Platform environments",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "power_platform_status") {
        return {
            content: [{
                type: "text",
                text: "Power Platform generic status: OK (Stub - Auth not configured)"
            }]
        };
    }

    if (name === "graph_query") {
        // Stub implementation
        const endpoint = String(args?.endpoint || "");
        return {
            content: [{
                type: "text",
                text: `[STUB] Querying Graph API: ${endpoint}\nConfig: Tenant=${MS_CONFIG.tenantId ? "OK" : "Missing"}`
            }]
        };
    }

    throw new Error(`Unknown tool: ${name}`);
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Microsoft MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
