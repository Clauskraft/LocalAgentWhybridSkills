# SCA-01 Cloud API

Cloud-hosted API server for SCA-01, deployed on Railway with PostgreSQL.

**Live URL:** `https://sca-01-phase3-production.up.railway.app`

## Quick Start

```bash
cd services/cloud
npm install
npm run build
npm start
```

Health check:

```bash
# Default dev port is 8787 (can be overridden by PORT; Railway typically sets PORT=3000)
curl http://127.0.0.1:8787/health
```

## Features

### 🔐 Authentication
- JWT-based authentication (ES256)
- User registration and login
- Token refresh mechanism
- Secure password hashing (bcrypt)

### 💬 Sessions & Messages
- Create/manage chat sessions
- Store message history
- Model selection per session
- System prompt configuration

### 🔧 MCP over HTTP
- Tool listing and calling
- Streamable HTTP transport
- Bearer token authentication

### 📝 Notion Integration
- Sync sessions to Notion database
- Sync blackboard (HANDOVER_LOG)
- Append messages to Notion pages

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify
- **Database:** PostgreSQL
- **Hosting:** Railway
- **Auth:** JWT (jose library)
- **Integrations:** Notion API

## API Endpoints

### Public

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness (DB ping) |
| `/mcp/info` | GET | MCP server info |
| `/api/models` | GET | List models from configured Ollama upstream |
| `/api/chat` | POST | Proxy chat requests to configured Ollama upstream |

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register new user |
| `/auth/login` | POST | Login and get tokens |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/token` | POST | OAuth2 token endpoint |

### Sessions (requires auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | GET | List user's sessions |
| `/api/sessions` | POST | Create new session |
| `/api/sessions/:id` | GET | Get session details |
| `/api/sessions/:id` | PUT | Update session |
| `/api/sessions/:id` | DELETE | Delete session |
| `/api/sessions/:id/messages` | GET | Get messages |
| `/api/sessions/:id/messages` | POST | Add message |

### MCP (requires auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/tools` | GET | List available tools |
| `/mcp/tools/call` | POST | Call a tool |

### Notion (requires auth + config)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notion/status` | GET | Check Notion connection |
| `/api/notion/sync/session` | POST | Sync session to Notion |
| `/api/notion/sync/message` | POST | Append message to Notion |
| `/api/notion/sync/blackboard` | POST | Sync HANDOVER_LOG |
| `/api/notion/sessions` | GET | List sessions from Notion |

## Deployment

### Railway (Recommended)

1. Connect GitHub repo to Railway
2. Add PostgreSQL plugin
3. Set environment variables
4. Deploy automatically


### Environment Variables

Copy `env.example` to your own env file and edit values:

```bash
cp env.example .env
```

```bash
# Required
DATABASE_URL=postgresql://...

# Security / Networking
# Comma-separated origins; if empty, CORS disabled (deny by default)
CORS_ORIGINS=https://your-frontend.example.com
# Rate limit
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW=1 minute
# Trust proxy for Railway/ingress
TRUST_PROXY=true

# LLM upstream (optional)
# Used by /api/models and /api/chat to proxy to an Ollama instance.
# Must be reachable from Railway and must NOT be localhost/127.0.0.1.
OLLAMA_HOST=

# Notion (optional)
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx
NOTION_BLACKBOARD_PAGE_ID=xxx

# Server
PORT=3000
HOST=::
```

## Health Check

- `GET /health`: always returns 200 once the server is listening.
- `GET /ready`:
  - In `NODE_ENV=production`, returns **503** until `DATABASE_URL` is set and migrations have completed successfully.
  - Otherwise returns 200 and includes whether DB is configured.
- `GET /api/models` and `POST /api/chat`: return **503** unless `OLLAMA_HOST` is configured.

### Database Migrations
```bash
# Dev / local (TS)
npm run db:migrate:dev

# After build (production)
npm run db:migrate
```

### Manual Deploy

```bash
# Install
npm install

# Build
npm run build

# Start
npm start
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally
npm start

# Test health
curl http://localhost:8787/health
```

## Database Schema

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  model VARCHAR(100) NOT NULL,
  system_prompt TEXT,
  notion_page_id VARCHAR(255),
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security

- All passwords hashed with bcrypt
- JWT tokens with short expiry (15 min access, 7 day refresh)
- Rate limiting (100 req/min)
- CORS configured
- Helmet security headers
- SQL injection protection (parameterized queries)

## Project Structure

```
services/cloud/
├── src/
│   ├── auth/
│   │   └── jwtAuth.ts          # JWT service
│   ├── db/
│   │   ├── database.ts         # PostgreSQL connection
│   │   ├── userRepository.ts   # User CRUD
│   │   └── sessionRepository.ts # Session/Message CRUD
│   ├── logging/
│   │   └── hyperlog.ts         # JSONL logging
│   ├── notion/
│   │   └── notionClient.ts     # Notion API client
│   ├── routes/
│   │   ├── authRoutes.ts       # Auth endpoints
│   │   ├── sessionRoutes.ts    # Session endpoints
│   │   └── notionRoutes.ts     # Notion endpoints
│   ├── server/
│   │   └── httpServer.ts       # Fastify server
│   ├── types/
│   │   └── fastify.d.ts        # Type extensions
│   └── cli.ts                  # CLI client
├── railway.json                # Railway config
├── nixpacks.toml              # Build config
└── package.json
```

## License

Private - SCA-01 Project
