# SCA-01 Phase 3: Cloud Mode

> MCP over HTTP with JWT authentication and Zero Trust security

## 🎯 Features

- **HTTP Transport**: MCP protocol over RESTful HTTP endpoints
- **JWT Authentication**: Short-lived tokens with automatic refresh
- **Zero Trust**: All requests require valid tokens with scope validation
- **Rate Limiting**: Protection against abuse
- **Security Headers**: Helmet.js for secure HTTP headers
- **Audit Logging**: All operations logged with HyperLog

## 🚀 Quick Start

### Start Server

```bash
cd sca-01-phase3
npm install
npm run dev:server
```

Server runs at http://localhost:8787

### Connect Client

```bash
# Set credentials
$env:SCA_CLIENT_ID = "my-agent"
$env:SCA_CLIENT_SECRET = "secure-password-here"

# Check health
npm run dev -- health

# List tools
npm run dev -- tools

# Call a tool
npm run dev -- call read_file '{"path": "README.md"}'
```

## 📋 API Endpoints

### Public

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/mcp/info` | GET | Server info |

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/token` | POST | Get access token |

```json
{
  "grant_type": "client_credentials",
  "client_id": "your-client-id",
  "client_secret": "your-secret"
}
```

### Protected (requires Bearer token)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/tools` | GET | List available tools |
| `/mcp/tools/call` | POST | Execute a tool |
| `/mcp` | POST | MCP JSON-RPC endpoint |

## 🔐 Security

### Token Lifecycle

```
1. Client authenticates with client_credentials
2. Server issues short-lived access token (15 min)
3. Client includes token in Authorization header
4. On expiry, client uses refresh_token to get new access token
5. Keys rotate every hour
```

### Scopes

- `tools:read` - List tools
- `tools:call` - Execute tools

### Rate Limiting

- 100 requests per minute per IP

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SCA_PORT` | `8787` | Server port |
| `SCA_HOST` | `0.0.0.0` | Server host |
| `SCA_SERVER_URL` | `http://localhost:8787` | Server URL (client) |
| `SCA_CLIENT_ID` | - | Client ID |
| `SCA_CLIENT_SECRET` | - | Client secret |

## 📁 Files

```
sca-01-phase3/
├── src/
│   ├── cli.ts                 # CLI interface
│   ├── auth/
│   │   └── jwtAuth.ts         # JWT token service
│   ├── client/
│   │   └── httpClient.ts      # HTTP client for MCP
│   ├── server/
│   │   └── httpServer.ts      # Fastify HTTP server
│   └── logging/
│       └── hyperlog.ts        # Audit logging
├── config/
│   └── keys/                  # JWT signing keys (auto-generated)
└── logs/
    ├── http-server.jsonl      # Server logs
    └── security.jsonl         # Security audit logs
```

## 🔮 Next: Phase 4 (Agent Mesh)

- Agent registry
- Multi-agent coordination
- Parallel tool calling
- Discovery protocol

