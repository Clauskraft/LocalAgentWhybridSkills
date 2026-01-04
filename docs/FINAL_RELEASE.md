# Final Release Playbook (Release Captain)

This document defines the **fast, safe path to ship the final release** using Cursor agents working in parallel without losing coherence.

## Goal

Ship a **final release** where:

- Core flows work end-to-end (cloud/web/desktop as applicable)
- Security baseline is met (no secrets, least privilege, safe defaults)
- Verification is repeatable (commands + smoke checks)

## Roles

- **Release Captain**: owns scope, priorities, and merge gates for release work.
- **Area Owners**: implement tasks in their area (cloud/web/desktop/infra/security).

## Priorities

- **P0 (release blocker)**: must be fixed before release.
- **P1 (release quality)**: required for release quality/stability.
- **P2 (nice-to-have)**: only if time permits; never delays P0/P1.

## Work Rules (to keep agents aligned)

- **One issue = one PR** (small, reviewable).
- **Feature freeze**: no new features outside the defined rest backlog without explicit Release Captain approval.
- Every PR includes:
  - **How to verify** (exact steps/commands)
  - tests per policy (see DoD)
  - `.env.example` updates when env vars change
- Prefer **make targets** where available (`make mvp`, `make release`, `make audit`).

## Definition of Done (release-grade)

For any release task PR:

- Tests:
  - **Every new API or worker function** has at least **one integration test** and **one smoke test** (or explicitly N/A).
- Security:
  - No secrets/tokens/credentials committed.
  - Least privilege and safe defaults preserved.
- Docs:
  - If user-facing or operational changes: update README sections where relevant (Quick Start / Env Vars / Health Check).

## Kickoff: “Finish-line kickoff” criteria

Kickoff is considered complete when:

- A GitHub Project exists for the release (Backlog/Ready/In Progress/In Review/Done/Blocked).
- If Projects are not available, a GitHub **Milestone** named **“Final Release”** exists and all release issues are assigned to it.
- **Rest backlog** is captured as issues using the “🚢 Final Release Task” template.
- All P0 items are labeled and placed in **Ready** with clear acceptance + verification steps.
- Release Captain confirms scope policy (what counts as “in” for final release).

## Daily cadence (lightweight)

- Release Captain reviews:
  - New issues (triage → prioritize → assign area)
  - PRs (merge gates + verify steps)
  - Blockers (unblock or descope)

## Handoffs (between Cursor agents)

Use `docs/HANDOVER_LOG.md` for short handoffs:

- What changed
- Where (paths)
- How to verify
- Next step (who/what)


