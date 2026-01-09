
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { DeviceCodeCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";

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

// Configuration for "Dot.Corp" (Azure App Registration)
// Users should set these ENV vars or we default to a 'common' tenant with a known Client ID if available.
// For now, we use placeholders that the user must fill or we provide a default specific to the branding.
const MS_CONFIG = {
    tenantId: process.env.MS_TENANT_ID || "common",
    clientId: process.env.MS_CLIENT_ID || "04b07795-8ddb-461a-bbee-02f9e1bf7b46", // Standard Microsoft Graph CLI client ID commonly used for dev
};

// Global Graph Client
let graphClient: Client | null = null;
let credential: DeviceCodeCredential | null = null;

async function getGraphClient() {
    if (graphClient) return graphClient;

    console.error("[Dot.Corp] Initializing Azure Auth (Device Code Flow)...");

    // Using DeviceCodeCredential which prints a code to stderr for the user to login
    credential = new DeviceCodeCredential({
        tenantId: MS_CONFIG.tenantId,
        clientId: MS_CONFIG.clientId,
        userPromptCallback: (info) => {
            console.error(`[AUTH REQUIRED] Please go to ${info.verificationUri} and enter code: ${info.userCode}`);
        }
    });

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ["User.Read", "Directory.Read.All", "Files.Read.All", "Sites.Read.All"]
    });

    graphClient = Client.initWithMiddleware({
        authProvider: authProvider
    });

    return graphClient;
}

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
                            description: "Graph API endpoint (e.g. /me, /me/messages, /sites)",
                        },
                    },
                    required: ["endpoint"],
                },
            },
            {
                name: "login_status",
                description: "Check authentication status and trigger login if needed",
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

    if (name === "login_status") {
        try {
            const client = await getGraphClient();
            // Try a simple call to verify
            const me = await client.api("/me").get();
            return {
                content: [{
                    type: "text",
                    text: `Authenticated as: ${me.displayName} (${me.mail || me.userPrincipalName})`
                }]
            };
        } catch (err: any) {
            return {
                content: [{
                    type: "text",
                    text: `Status: Not Authenticated / Error.\nMessage: ${err.message}\n\nCheck logs for Device Code if this is the first run.`
                }]
            };
        }
    }

    if (name === "graph_query") {
        const endpoint = String(args?.endpoint || "");
        if (!endpoint) throw new Error("Endpoint is required");

        try {
            const client = await getGraphClient();
            const res = await client.api(endpoint).get();
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(res, null, 2)
                }]
            };
        } catch (err: any) {
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Graph Error: ${err.message}`
                }]
            };
        }
    }

    throw new Error(`Unknown tool: ${name}`);
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("_Dot.Corp Microsoft Agent Ready_");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
