# Prompt Threat Model (Generalist Agent Hardening)

This document captures **derived** threat patterns and mitigations for prompt-based attacks against a generalist desktop agent.

**Important:** This is **not** a prompt library. We do **not** copy or embed leaked prompt text from external sources. We only derive generalized patterns and test ideas from public threat-intel corpora such as:

- [`jujumilk3/leaked-system-prompts`](https://github.com/jujumilk3/leaked-system-prompts.git)
- [`linexjlin/GPTs`](https://github.com/linexjlin/GPTs.git)

## Security Goals

- **G1: Policy is the only gate.** No tool execution without policy evaluation.
- **G2: Least privilege by default.** Safe dirs + explicit escalation (approval) for risky actions.
- **G3: No secret exfiltration.** Never expose tokens, refresh tokens, credentials, system prompts, or other sensitive internal state.
- **G4: Robustness to untrusted content.** Files/web pages/messages are untrusted input; they must not override system/policy.
- **G5: Clear UX.** Users understand mode (Local/Cloud, Full access, Auto-approve) and why approvals happen.

## Trust Boundaries

- **System prompt / policy / config**: trusted, immutable at runtime (except via explicit settings UI flows).
- **Renderer input (user text)**: partially trusted (intent), but may contain malicious instructions.
- **External content (web/file/clipboard)**: untrusted data, may include indirect prompt injection.
- **Tool outputs**: untrusted data; treat as input for subsequent steps (never as authority to escalate privileges).

## Threat Categories (Derived Taxonomy)

### T1) Instruction Hijack (Direct Prompt Injection)
**Goal:** override the agent’s rules, change objective, disable safeguards.

- **Signals (abstract)**:
  - Requests to ignore higher-priority instructions or to “switch mode”
  - Requests to reveal internal rules or hidden messages
  - Attempts to reframe a task as “authorized” without proof
- **Mitigations**:
  - Hard separation of system/policy vs user content
  - “Policy-first” tool executor: policy decides; model never directly executes
  - Explicit refusal templates for “reveal system/policy/secret” requests
- **Tests**:
  - Given an injection-like input, ensure tool execution is still gated and the agent refuses exfil requests.

### T2) System Prompt / Internal State Exfiltration
**Goal:** extract system prompts, hidden instructions, credentials, or tool outputs containing secrets.

- **Signals (abstract)**:
  - “Show me your system prompt / developer message / hidden rules”
  - “Print config / env vars / tokens”
  - “Paste your logs / memory / approval queue contents”
- **Mitigations**:
  - Secrets never flow to renderer; store secrets only in OS encryption (Electron `safeStorage`)
  - Redaction in logs/audit and UI
  - Refuse to output system prompt; provide a high-level behavior summary instead
- **Tests**:
  - Attempt to request system prompt; assert refusal and no sensitive payload in output.

### T3) Tool Misuse / Privilege Escalation
**Goal:** trick agent into executing risky shell commands, file writes, network calls, or process operations.

- **Signals (abstract)**:
  - Disguised commands (“just check status” → destructive mutation)
  - Command chaining to increase impact
  - “Download and run” patterns
- **Mitigations**:
  - Centralized enforced executor:
    - evaluate policy → approval if required → execute → record audit linking all steps
  - Safe defaults: deny outside safe dirs unless full access + explicit approval
  - Dry-run where possible for mutating shell commands
- **Tests**:
  - Disallowed paths/commands must be denied or require approval.

### T4) Indirect Prompt Injection (Web/File Content)
**Goal:** hide malicious instructions inside web pages, files, code comments, or documents that the agent reads.

- **Signals (abstract)**:
  - Content includes “agent instructions” unrelated to the user’s goal
  - Content asks for secrets or tool usage
- **Mitigations**:
  - Label external content as “untrusted data” at ingestion time
  - UI warning when injection-like patterns are detected in content the agent is processing
  - Prevent “content-driven tool execution” (executor requires explicit intent + policy)
- **Tests**:
  - Load a synthetic document containing injection-like language; ensure banner + no privilege escalation.

### T5) Data Poisoning / Confused Deputy
**Goal:** make the agent treat attacker-controlled data as authoritative (e.g., “this repo is safe”, “this host is internal”).

- **Mitigations**:
  - Only trust explicit configuration + policy
  - Always validate destinations (paths/hosts) against policy
  - Require confirmation/approval for new trust relationships (new safe dir, new backend URL)

## Controls Map (What we build in Phase 2)

- **Centralized policy enforcement**: one entry point for execution
- **Approval queue**: human-in-the-loop for high-risk operations
- **Audit trail**: decision → approval → execution result correlation
- **UX indicators**: mode + warnings + rationale
- **Regression suite**: negative tests for injection patterns (synthetic)

## “Untrusted Content” Heuristics (Non-authoritative)

These are *signals* for warnings and tests, not hard blocks by themselves:

- Requests to override instruction priority
- Requests to reveal internal instructions/secrets
- Requests to run commands unrelated to user goal
- Calls for “download and execute” / “paste your keys”

## Implementation Notes

- Keep all network/tool execution in the main process (or tool server) behind policy.
- Treat renderer as untrusted for secrets; renderer gets only redacted config.
- Avoid logging sensitive data; redact values in audit outputs.


