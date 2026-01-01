import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { getAuthService, TokenPayload } from "../auth/jwtAuth.js";
import { HyperLog } from "../logging/hyperlog.js";
import { initializeDatabase } from "../db/database.js";
import { registerAuthRoutes } from "../routes/authRoutes.js";
import { registerSessionRoutes } from "../routes/sessionRoutes.js";

// ============================================================================
// HTTP SERVER FOR MCP OVER HTTP
// Implements MCP Streamable HTTP Transport with JWT authentication
// ============================================================================

interface ServerConfig {
  host: string;
  port: number;
  corsOrigins: string[];
  rateLimit: {
    max: number;
    timeWindow: string;
  };
  trustProxy: boolean;
}

const DEFAULT_CONFIG: ServerConfig = {
  host: "0.0.0.0",
  port: 8787,
  corsOrigins: ["http://localhost:3000", "http://localhost:5173"],
  rateLimit: {
    max: 100,
    timeWindow: "1 minute"
  },
  trustProxy: false
};

// MCP Message schemas
const McpRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional()
});

const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.unknown()).optional()
});

export async function createServer(config: Partial<ServerConfig> = {}): Promise<ReturnType<typeof Fastify>> {
  const cfg: ServerConfig = { ...DEFAULT_CONFIG, ...config };
  const log = new HyperLog("./logs", "http-server.jsonl");
  const auth = getAuthService();
  await auth.initialize();

  const app = Fastify({
    logger: {
      level: "info"
    },
    trustProxy: cfg.trustProxy
  });

  // Security middleware
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"]
      }
    }
  });

  await app.register(cors, {
    origin: cfg.corsOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    credentials: true
  });

  await app.register(rateLimit, {
    max: cfg.rateLimit.max,
    timeWindow: cfg.rateLimit.timeWindow
  });

  // Request ID decorator - store in custom property
  app.addHook("onRequest", async (request) => {
    (request as unknown as { reqId: string }).reqId = 
      (request.headers["x-request-id"] as string) || crypto.randomUUID();
  });

  // Auth decorator
  app.decorateRequest("user", null);

  // JWT verification hook for protected routes
  const verifyJwt = async (request: { headers: { authorization?: string }; user: TokenPayload | null }) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw { statusCode: 401, message: "Missing or invalid authorization header" };
    }

    const token = authHeader.slice(7);
    const payload = await auth.verifyToken(token);
    
    if (!payload) {
      throw { statusCode: 401, message: "Invalid or expired token" };
    }

    request.user = payload;
  };

  // ========== PUBLIC ROUTES ==========

  // Health check
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString(), version: "0.3.0" };
  });

  // MCP Server Info (public)
  app.get("/mcp/info", async () => {
    return {
      name: "sca-01-cloud",
      version: "0.3.0",
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
        prompts: { listChanged: false }
      }
    };
  });

  // ========== AUTH ROUTES ==========

  // Token endpoint
  app.post("/auth/token", async (request, reply) => {
    const body = request.body as { 
      grant_type: string; 
      client_id?: string; 
      client_secret?: string;
      refresh_token?: string;
    };

    if (body.grant_type === "client_credentials") {
      // Validate client credentials (in production: check against DB)
      const clientId = body.client_id;
      const clientSecret = body.client_secret;

      if (!clientId || !clientSecret) {
        return reply.status(400).send({ error: "invalid_request", error_description: "Missing credentials" });
      }

      // TODO: Validate against registered clients
      // For demo, accept any non-empty credentials
      if (clientSecret.length < 8) {
        return reply.status(401).send({ error: "invalid_client" });
      }

      const tokens = await auth.generateTokenPair(clientId, ["tools:read", "tools:call"], clientId);
      
      log.info("auth.token.issued", "Access token issued", { clientId });
      
      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: tokens.tokenType,
        expires_in: tokens.expiresIn
      };
    }

    if (body.grant_type === "refresh_token") {
      const refreshToken = body.refresh_token;
      
      if (!refreshToken) {
        return reply.status(400).send({ error: "invalid_request", error_description: "Missing refresh_token" });
      }

      const tokens = await auth.refreshTokenPair(refreshToken);
      
      if (!tokens) {
        return reply.status(401).send({ error: "invalid_grant" });
      }

      log.info("auth.token.refreshed", "Token refreshed");
      
      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: tokens.tokenType,
        expires_in: tokens.expiresIn
      };
    }

    return reply.status(400).send({ error: "unsupported_grant_type" });
  });

  // ========== PROTECTED MCP ROUTES ==========

  // List tools
  app.get("/mcp/tools", { preHandler: [verifyJwt as never] }, async (request) => {
    const user = (request as { user: TokenPayload }).user;
    
    if (!user.scopes.includes("tools:read")) {
      throw { statusCode: 403, message: "Insufficient permissions" };
    }

    log.info("mcp.tools.list", "Tools listed", { agentId: user.agentId });

    // Return available tools (simplified for Phase 3)
    return {
      tools: [
        {
          name: "read_file",
          description: "Read a file from the server filesystem",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" }
            },
            required: ["path"]
          }
        },
        {
          name: "write_file",
          description: "Write content to a file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
              content: { type: "string", description: "File content" }
            },
            required: ["path", "content"]
          }
        },
        {
          name: "run_command",
          description: "Execute a shell command (restricted)",
          inputSchema: {
            type: "object",
            properties: {
              command: { type: "string", description: "Command to run" },
              cwd: { type: "string", description: "Working directory" }
            },
            required: ["command"]
          }
        },
        {
          name: "http_request",
          description: "Make an HTTP request",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL to request" },
              method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] },
              headers: { type: "object" },
              body: { type: "string" }
            },
            required: ["url"]
          }
        }
      ]
    };
  });

  // Call tool
  app.post("/mcp/tools/call", { preHandler: [verifyJwt as never] }, async (request, reply) => {
    const user = (request as { user: TokenPayload }).user;
    
    if (!user.scopes.includes("tools:call")) {
      throw { statusCode: 403, message: "Insufficient permissions" };
    }

    const parseResult = ToolCallSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Invalid tool call format" });
    }

    const { name, arguments: args } = parseResult.data;
    
    log.info("mcp.tools.call", `Tool called: ${name}`, { 
      agentId: user.agentId, 
      tool: name 
    });

    // Execute tool (simplified - in production connect to actual tool implementations)
    try {
      const result = await executeToolCall(name, args ?? {}, log);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        isError: false
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Tool execution failed";
      log.error("mcp.tools.error", msg, { tool: name });
      return {
        content: [{ type: "text", text: msg }],
        isError: true
      };
    }
  });

  // MCP JSON-RPC endpoint (for full protocol compliance)
  app.post("/mcp", { preHandler: [verifyJwt as never] }, async (request, reply) => {
    const parseResult = McpRequestSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Invalid Request" }
      });
    }

    const { id, method, params } = parseResult.data;
    const user = (request as { user: TokenPayload }).user;

    log.info("mcp.rpc", `RPC: ${method}`, { agentId: user.agentId, method });

    try {
      const result = await handleMcpMethod(method, params, user, log);
      return { jsonrpc: "2.0", id, result };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Internal error";
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: msg }
      };
    }
  });

  // ========== ERROR HANDLER ==========
  
  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    log.error("http.error", error.message, { statusCode });
    
    reply.status(statusCode).send({
      error: statusCode >= 500 ? "Internal Server Error" : error.message,
      statusCode
    });
  });

  return app;
}

// Tool execution (simplified)
async function executeToolCall(
  name: string, 
  args: Record<string, unknown>,
  log: HyperLog
): Promise<unknown> {
  switch (name) {
    case "read_file": {
      const path = args.path as string;
      // In production: apply policy checks
      const fs = await import("node:fs/promises");
      const content = await fs.readFile(path, "utf8");
      return { content };
    }
    
    case "write_file": {
      const path = args.path as string;
      const content = args.content as string;
      const fs = await import("node:fs/promises");
      await fs.writeFile(path, content, "utf8");
      return { success: true, path };
    }
    
    case "run_command": {
      const command = args.command as string;
      const cwd = args.cwd as string | undefined;
      
      // Block dangerous commands
      const blocked = ["rm -rf", "format", "del /", "shutdown"];
      if (blocked.some(b => command.includes(b))) {
        throw new Error("Command blocked by policy");
      }
      
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);
      
      const { stdout, stderr } = await execAsync(command, { cwd, timeout: 30000 });
      return { stdout, stderr };
    }
    
    case "http_request": {
      const url = args.url as string;
      const method = (args.method as string) ?? "GET";
      const headers = args.headers as Record<string, string> | undefined;
      const body = args.body as string | undefined;
      
      const response = await fetch(url, {
        method,
        headers,
        body: method !== "GET" ? body : undefined
      });
      
      const text = await response.text();
      return { 
        status: response.status, 
        headers: Object.fromEntries(response.headers), 
        body: text 
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// MCP method handler
async function handleMcpMethod(
  method: string,
  params: Record<string, unknown> | undefined,
  user: TokenPayload,
  log: HyperLog
): Promise<unknown> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: { listChanged: false }
        },
        serverInfo: {
          name: "sca-01-cloud",
          version: "0.3.0"
        }
      };
    
    case "tools/list":
      return {
        tools: [
          { name: "read_file", description: "Read file", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
          { name: "write_file", description: "Write file", inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } },
          { name: "run_command", description: "Run command", inputSchema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
          { name: "http_request", description: "HTTP request", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } }
        ]
      };
    
    case "tools/call": {
      const name = params?.name as string;
      const args = params?.arguments as Record<string, unknown> | undefined;
      
      if (!name) throw new Error("Missing tool name");
      
      const result = await executeToolCall(name, args ?? {}, log);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }]
      };
    }
    
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

// Main entry point
async function main(): Promise<void> {
  const port = parseInt(process.env.PORT ?? process.env.SCA_PORT ?? "8787", 10);
  const host = process.env.SCA_HOST ?? "0.0.0.0";
  const log = new HyperLog("./logs", "startup.jsonl");

  // Initialize database if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    console.log("📦 Initializing database...");
    try {
      await initializeDatabase();
      console.log("✅ Database ready");
    } catch (err) {
      console.error("❌ Database initialization failed:", err);
      // Continue without database in dev mode
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
    }
  } else {
    console.log("⚠️ DATABASE_URL not set - running without persistence");
  }
  
  const server = await createServer({ port, host });

  // Register user auth routes (register/login)
  if (process.env.DATABASE_URL) {
    registerAuthRoutes(server, log);
    registerSessionRoutes(server, log);
    console.log("✅ User routes registered");
  }

  // Add JWT verify decorator for routes
  server.decorate("verifyJwt", async (request: { headers: { authorization?: string }; user: TokenPayload | null }) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw { statusCode: 401, message: "Missing authorization header" };
    }
    const token = authHeader.slice(7);
    const auth = getAuthService();
    const payload = await auth.verifyToken(token);
    if (!payload) {
      throw { statusCode: 401, message: "Invalid token" };
    }
    request.user = payload;
  });
  
  try {
    await server.listen({ port, host });
    console.log(`🚀 SCA-01 Cloud Server running at http://${host}:${port}`);
    console.log(`📋 MCP endpoint: http://${host}:${port}/mcp`);
    console.log(`🔐 Auth: POST http://${host}:${port}/auth/login`);
    console.log(`📊 API: http://${host}:${port}/api/sessions`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main().catch(console.error);

