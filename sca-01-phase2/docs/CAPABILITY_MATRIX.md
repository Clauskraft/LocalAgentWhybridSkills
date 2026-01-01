# SCA-01 Phase 2 - Desktop Agent Capability Matrix

> **Version:** 0.2.0
> **Status:** Full PC Access with Approval Gates

---

## ✅ PHASE 2 CAPABILITIES

### 🖥️ Full System Access

| Capability | Tool | Risk Level | Approval |
|------------|------|------------|----------|
| Read any file | `read_file` | Low-Medium | Auto (safe dirs) |
| Write any file | `write_file` | High | Required* |
| List directories | `list_directory` | Low | Auto |
| File info/metadata | `file_info` | Low | Auto |
| Search files by pattern | `search_files` | Low | Auto |

### 💻 Shell Execution

| Capability | Tool | Risk Level | Approval |
|------------|------|------------|----------|
| Auto shell (PS/Bash) | `run_shell` | Medium-High | Policy-based |
| PowerShell (Windows) | `run_powershell` | Medium-High | Policy-based |
| Read-only commands | Various | Low | Auto |
| Mutating commands | Various | High | Required* |

### ⚙️ Process Management

| Capability | Tool | Risk Level | Approval |
|------------|------|------------|----------|
| List processes | `list_processes` | Low | Auto |
| Kill process | `kill_process` | High | Required |
| Start process | Via shell | Medium | Policy-based |

### 📋 Clipboard

| Capability | Tool | Risk Level | Approval |
|------------|------|------------|----------|
| Read clipboard | `clipboard_read` | Low | Auto |
| Write clipboard | `clipboard_write` | Medium | Required* |

### 🌐 Network/Browser

| Capability | Tool | Risk Level | Approval |
|------------|------|------------|----------|
| HTTP requests | `http_request` | Medium | Auto (internal) |
| Open URL in browser | `open_url` | Medium | Policy-based |
| Check port | `check_port` | Low | Auto |
| Connectivity check | `check_connectivity` | Low | Auto |
| Get local IPs | `get_local_ips` | Low | Auto |
| Screenshot | `screenshot` | Medium | Auto |

### 📊 System Information

| Capability | Tool | Risk Level | Approval |
|------------|------|------------|----------|
| System info (CPU/RAM/OS) | `system_info` | Low | Auto |
| Network interfaces | `network_interfaces` | Low | Auto |
| Environment variables | `environment_vars` | Low | Auto (redacted) |

### 🔐 Approval System

| Capability | Tool | Risk Level | Approval |
|------------|------|------------|----------|
| View pending approvals | `approval_status` | Low | Auto |
| Interactive approval (CLI) | `approve` command | N/A | User action |
| Desktop approval (UI) | Electron UI | N/A | User action |

*\* = Skipped if `SCA_AUTO_APPROVE=true`*

---

## 🛡️ Security Model

### Policy Engine

```
┌─────────────────────────────────────────────────────────────┐
│                    POLICY EVALUATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Request → Policy Engine → Decision                        │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Is Blocked? │ →  │ Is Safe Dir? │ →  │ Full Access? │   │
│  │ (.git, etc) │    │ (allowlist)  │    │ (env flag)   │   │
│  └─────────────┘    └──────────────┘    └──────────────┘   │
│        ↓ No              ↓ Yes              ↓ Yes          │
│     BLOCKED           ALLOWED            ALLOWED*          │
│                                          (*may need        │
│                                           approval)        │
└─────────────────────────────────────────────────────────────┘
```

### Blocked Paths (Always)

- `C:\Windows\System32\config`
- `C:\Windows\System32\drivers`
- `/etc/shadow`, `/etc/sudoers`, `/boot`
- `.ssh/id_rsa`, `.ssh/id_ed25519`
- `.gnupg`, `.aws/credentials`, `.azure`
- Browser profile directories

### Blocked Commands (Always)

- `rm -rf /`, `rm -rf /*`
- `del /f /s /q c:\*`, `format c:`
- Fork bombs, `mkfs`, destructive `dd`
- `chmod -R 777 /`, `takeown /f c:\`

### High-Risk Commands (Approval Required)

- `rm -rf`, `rmdir /s`, `del /f /s`
- `shutdown`, `reboot`
- `taskkill`, `kill -9`, `pkill`
- `net user`, `netsh`, `reg add/delete`
- `chmod`, `chown`, `sudo`, `runas`

---

## 🎛️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SCA_FULL_ACCESS` | `false` | Enable full system access |
| `SCA_AUTO_APPROVE` | `false` | Skip all approval gates |
| `SCA_SAFE_DIRS` | `.` | Comma-separated safe directories |
| `SCA_LOG_DIR` | `./logs` | HyperLog output directory |
| `SCA_MAX_TURNS` | `16` | Max agent loop iterations |
| `SCA_SHELL_TIMEOUT` | `300000` | Shell command timeout (ms) |
| `SCA_MAX_FILE_SIZE` | `10000000` | Max file size to read (bytes) |

### Access Modes

| Mode | Full Access | Auto Approve | Description |
|------|-------------|--------------|-------------|
| Restricted | `false` | `false` | Safe exploration only |
| Full + Gates | `true` | `false` | Full access with approvals |
| Full + Auto | `true` | `true` | ⚠️ DANGEROUS - no gates |

---

## 🖼️ Desktop UI Features

### Main Console
- Goal input with Enter-to-run
- Real-time output display
- Status indicator (Ready/Running/Error)

### Approval Queue
- Live list of pending requests
- Risk level badges (low/medium/high)
- One-click approve/reject
- Approve All / Reject All buttons

### System Notifications
- Desktop notifications for new approvals
- Critical urgency for high-risk requests

---

## 📊 vs. Phase 1 Comparison

| Feature | Phase 1 | Phase 2 |
|---------|---------|---------|
| File access | Repo only | Full system |
| Shell | Make targets only | Any command |
| Process management | ❌ | ✅ Full |
| Clipboard | ❌ | ✅ Read/Write |
| Browser/HTTP | ❌ | ✅ Full |
| System info | ❌ | ✅ Full |
| UI | CLI only | CLI + Electron |
| Approval gates | Env flags | Interactive UI |
| SelfHealingAdapter | ❌ | ✅ Integrated |
| Max turns | 8 | 16 |
| Tools count | 6 | 20+ |

---

## ⚠️ Restrisiko

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM writes malicious code | Medium | Critical | Approval gates |
| Shell command causes damage | Medium | High | Command blocklist + approval |
| Path traversal bypass | Low | High | Robust policy engine |
| Approval fatigue | Medium | High | Clear descriptions + batch ops |
| Auto-approve misuse | Low | Critical | Disabled by default + warnings |

---

## 🚀 Usage Examples

### Safe Exploration (Default)
```bash
npm run dev -- run --goal "What files are in this directory?"
```

### Full Access with Approval
```bash
SCA_FULL_ACCESS=true npm run dev -- run --goal "Update all package.json versions"
```

### Desktop UI Mode
```bash
npm run dev:ui
```

### Interactive Approval (Separate Terminal)
```bash
npm run dev -- approve
```

---

*SCA-01 Phase 2 - The Finisher with full desktop capabilities*

