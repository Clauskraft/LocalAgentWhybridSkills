# Multi-Device Development Guide

This document describes how SCA-01 enables development from any device while maintaining security and consistency.

## Architecture Overview

```mermaid
graph TB
    subgraph Devices["Development Devices"]
        Desktop["Desktop (Win/Mac/Linux)"]
        Mobile["Mobile (Android/iOS)"]
        Web["Web Browser"]
    end
    
    subgraph GitHub["GitHub (Source of Truth)"]
        Repo["Repository"]
        Actions["GitHub Actions"]
        Releases["GitHub Releases"]
    end
    
    subgraph Cloud["Railway Cloud"]
        API["Fastify API"]
        DB["PostgreSQL"]
    end
    
    subgraph Local["Local Runtime"]
        Ollama["Ollama LLM"]
        Agent["SCA-01 Agent"]
    end
    
    Desktop --> Repo
    Mobile --> API
    Web --> API
    
    Repo --> Actions
    Actions --> Releases
    
    API --> DB
    Agent --> Ollama
    Desktop --> Agent
</graph>
```

## Auto-Update System

### How Updates Work

1. **Developer pushes code** → GitHub Actions builds all platforms
2. **Tag created** → Release published to GitHub Releases
3. **Desktop apps check** → `electron-updater` polls GitHub every hour
4. **User notified** → Dialog prompts to download/install
5. **Seamless update** → App restarts with new version

### Configuration

```typescript
// In app settings
{
  "autoUpdate": {
    "checkOnStartup": true,
    "autoDownload": true,
    "autoInstallOnQuit": true,
    "checkInterval": 3600000 // 1 hour
  }
}
```

### Update Channels

| Channel | Branch | Purpose |
|---------|--------|---------|
| Stable | `main` | Production releases |
| Beta | `develop` | Pre-release testing |
| Nightly | `develop` | Daily builds for testing |

## Development Workflow

### From Desktop

```bash
# Clone repo
git clone https://github.com/Clauskraft/LocalAgentWhybridSkills.git

# Install and run
cd sca-01-phase2
npm ci --force
npm run start
```

### From Mobile (via Cloud)

1. Open SCA-01 mobile app
2. Login with Railway credentials
3. Chat with agent (synced via PostgreSQL)
4. View/edit code via GitHub integration

### From Web (GitHub Codespaces)

```bash
# Open in Codespaces from GitHub
# All dependencies pre-installed
npm run dev
```

## Release Process

### Manual Release

```powershell
# Set token
$env:GH_TOKEN = "ghp_..."

# Run release script
.\scripts\release.ps1 -VersionBump patch
```

### Automated Release (via Tags)

```bash
# Create and push tag
git tag -a v0.3.0 -m "Release 0.3.0"
git push origin v0.3.0

# GitHub Actions automatically:
# 1. Builds for Win/Mac/Linux
# 2. Signs packages
# 3. Publishes to GitHub Releases
# 4. Updates release notes
```

## Security Considerations

### Token Management

| Token | Purpose | Scope | Storage |
|-------|---------|-------|---------|
| `GH_TOKEN` | Releases | `repo` | `.env` (local only) |
| `RAILWAY_TOKEN` | Deploy | API access | GitHub Secrets |
| `NOTION_TOKEN` | Sync | Read/Write | `.env` |

### Code Signing (Future)

```yaml
# Windows: EV Code Signing Certificate
# macOS: Apple Developer ID
# Linux: GPG signing
```

## Sync Strategy

### Configuration Sync

```typescript
// Synced via Railway PostgreSQL
interface UserConfig {
  systemPrompt: string;
  mcpServers: MCPServerConfig[];
  tools: ToolPermission[];
  theme: "light" | "dark" | "system";
}
```

### Chat History Sync

- **Local**: SQLite for offline-first
- **Cloud**: PostgreSQL for cross-device
- **Conflict resolution**: Last-write-wins with timestamp

## Monitoring

### Health Checks

- **Desktop**: Automatic startup checks (Ollama, Node, memory)
- **Cloud**: `/health` endpoint on Railway
- **Mobile**: Network status + API connectivity

### Observability

```typescript
// All components log to HyperLog (JSONL)
{
  "ts": "2026-01-02T09:00:00Z",
  "level": "info",
  "event": "update.downloaded",
  "message": "Version 0.3.0 ready to install",
  "context": { "platform": "win32", "arch": "arm64" }
}
```

## Troubleshooting

### Update Not Working

1. Check internet connectivity
2. Verify `GH_TOKEN` is set (for dev builds)
3. Check logs: `logs/updater.hyperlog.jsonl`
4. Manual download from [GitHub Releases](https://github.com/Clauskraft/LocalAgentWhybridSkills/releases)

### Sync Issues

1. Check Railway status: `railway status`
2. Verify database connection
3. Check network logs in mobile app

## Future Enhancements

- [ ] **P2P sync** - Direct device-to-device when on same network
- [ ] **Offline queue** - Queue changes when offline, sync when online
- [ ] **Signed updates** - Cryptographic verification of update packages
- [ ] **Delta updates** - Download only changed files
- [ ] **Rollback** - Automatic rollback on failed updates

