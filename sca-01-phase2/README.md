# SCA-01 Phase 2 - Desktop Agent

> **Full PC Access Agent with Approval Gates**

Phase 2 extends SCA-01 with complete desktop capabilities matching what a human operator can do.

## 🚀 Capabilities

### Full System Access
- **Shell execution**: Run any command (PowerShell, Bash, CMD)
- **File system**: Read/write anywhere (with approval)
- **Process management**: List, start, kill processes
- **Network**: HTTP requests, port scanning, connectivity checks
- **Clipboard**: Read/write system clipboard
- **Browser automation**: Navigate, click, type, screenshot

### Approval Gates
All dangerous operations require explicit approval:
- File writes outside safe directories
- Shell commands with side effects
- Process termination
- Network connections to external hosts
- Clipboard modifications

### Desktop UI (Electron)
- Visual blackboard display
- Pending approval queue
- Real-time agent activity log
- Manual override controls

## ⚠️ Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    APPROVAL MATRIX                          │
├─────────────────────┬─────────────┬─────────────────────────┤
│ Operation           │ Risk Level  │ Approval Required       │
├─────────────────────┼─────────────┼─────────────────────────┤
│ Read file (safe)    │ 🟢 Low      │ Auto-approved           │
│ Read file (system)  │ 🟡 Medium   │ Auto-approved + logged  │
│ Write file (repo)   │ 🟡 Medium   │ Auto-approved if flag   │
│ Write file (system) │ 🔴 High     │ MANUAL APPROVAL         │
│ Shell (read-only)   │ 🟡 Medium   │ Auto-approved           │
│ Shell (mutating)    │ 🔴 High     │ MANUAL APPROVAL         │
│ Process kill        │ 🔴 High     │ MANUAL APPROVAL         │
│ Network (internal)  │ 🟢 Low      │ Auto-approved           │
│ Network (external)  │ 🟡 Medium   │ Auto-approved + logged  │
│ Browser automation  │ 🟡 Medium   │ Auto-approved           │
└─────────────────────┴─────────────┴─────────────────────────┘
```

## 🛠️ Quick Start

```bash
cd sca-01-phase2
npm install

# CLI mode (headless)
npm run dev -- doctor
npm run dev -- run

# Desktop UI mode
npm run dev:ui
```

## 📁 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen3` | Model with tool calling |
| `SCA_FULL_ACCESS` | `false` | Enable full PC access mode |
| `SCA_AUTO_APPROVE` | `false` | Skip approval gates (DANGEROUS) |
| `SCA_SAFE_DIRS` | `.` | Comma-separated safe directories |
| `SCA_LOG_DIR` | `./logs` | HyperLog output directory |

## 🔧 Tool Categories

### File Operations
- `read_file_anywhere` - Read any file on the system
- `write_file_anywhere` - Write to any location (approval required)
- `list_directory` - List directory contents
- `file_info` - Get file metadata
- `search_files` - Search for files by pattern

### Shell Execution
- `run_shell` - Execute shell commands
- `run_powershell` - Execute PowerShell scripts
- `run_bash` - Execute Bash commands

### Process Management
- `list_processes` - List running processes
- `kill_process` - Terminate a process (approval required)
- `start_process` - Start a new process

### System Information
- `system_info` - CPU, memory, disk, OS details
- `network_interfaces` - Network adapter info
- `environment_vars` - List environment variables

### Browser Automation
- `browser_navigate` - Open URL in browser
- `browser_screenshot` - Capture page screenshot
- `browser_click` - Click element
- `browser_type` - Type text

### Clipboard
- `clipboard_read` - Read clipboard contents
- `clipboard_write` - Write to clipboard (approval required)

## 📋 Phase 2 vs Phase 1

| Feature | Phase 1 | Phase 2 |
|---------|---------|---------|
| File access | Repo only | Full system |
| Shell | Make targets only | Any command |
| UI | CLI only | CLI + Electron |
| Approval gates | Env flags | Interactive UI |
| Browser | ❌ | ✅ Puppeteer |
| Clipboard | ❌ | ✅ |
| Processes | ❌ | ✅ |
| System info | ❌ | ✅ |

## 🔒 Restrisiko

- Full system access means potential for damage
- Approval gates are the primary safety mechanism
- Use `SCA_AUTO_APPROVE=false` (default) in production
- All operations are logged to HyperLog for audit

---

*SCA-01 Phase 2 - "The Finisher" with full desktop capabilities*

