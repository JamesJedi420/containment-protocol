# SPE-3337 — Linear read diagnostics

| Field      | Value    |
| ---------- | -------- |
| **Status** | **Done** |

Owner: [SPE-3337](https://linear.app/spectranoir/issue/SPE-3337), shared-system-owned, Containment Protocol Tooling / Developer Experience. No child required. Branch: `codex/spe-3337-linear-diagnostics`; base main: `683330e163fe1f1958ecd7c113d1b897e0990717`.

## Approved boundary and plan

Implement the approved Linear MCP availability/recovery extension as optional versioned diagnostic metadata consumed by the existing session preflight. Existing v1 callers stay compatible. Validate all four statuses, explicit failure categories, source identity, UTC observation time and fixed recovery guidance. Present successful reads separately from unverified write capability. Receiving sessions refresh their authorized connector read and issue evidence before implementation.

Use the existing connector for actual read evidence. No new transport, provider credential handling, mutation service, queue, selector, gameplay or duplicate Academy contract. The portable envelope, agent designation provenance and deferral/candidate classification remain outstanding parent acceptance. This slice alone cannot close SPE-3337.

## Validation and audit

Focused native tests cover unchanged v1 behavior, CP/Academy shared consumption, all failure categories, unchecked observations, stale/future timestamps, issue mismatch, contradictory source state, malformed fields and secret-safe rejection. The current required validator invokes these through the existing review test entry point; path-selection tests include the new module. Run existing SPE-3348 requirements, lint, formatting and backlog validation, exercise the CLI with actual connector evidence, and complete independent full-diff review before merge.

Six passes: approved integration; malformed/missing/stale/duplicate cases; deterministic reasons and no campaign state; existing preflight/CLI compatibility; operator and queue projections; cleanup. Record final results and merge evidence on the existing owner.

Local audit completed all six passes. A non-string evidence reference was found during edge-case review and is now rejected with regression coverage. The focused preflight plus selection run passed 47 tests; backlog validation passed after correcting this document's status table. Required environment, lint, requirements-model and preflight checks passed. The repository-wide advisory format check reports existing drift; touched-file formatting is checked separately.

An actual authorized Linear read began at `2026-11-06T10:14:04Z` and confirmed SPE-3337 In Progress with no blockers. The existing CLI with `--collect-local` retained that ready diagnostic and reported `readOnly: true`, `writeCapability: unverified`. Overall readiness correctly remained blocked because this implementation branch was attached and dirty; this is integration evidence, not a claim that the implementation checkout was ready to start another slice. Controlled fixtures separately establish all ready/failure/freshness cases.

## Selection and execution evidence

Current main was clean and synchronized, no open PRs remained, and the named-task managed-worktree start preflight returned `ready`. SPE-3338 remains stopped on its missing authoritative feed/workstream metadata; continuing this active approved owner reuses the shipped preflight directly. The user explicitly authorized repeating selection through merge without a confirmation between slices.

Earlier Hermes mapping for this owner returned unsupported claims; retain its documented bounded direct fallback and do not repeat equivalent failed mapping. Freebuff remains disabled. No new authority follows from this plan or its test results.

## Merge evidence

Merged in PR #4875 at `387f5b85824ec0390ff5c07462c20fce1952722f`. Review added cross-project coverage and rejected sub-millisecond precision at both freshness operands. Final focused run: 48 passed; CI run 42202770687 passed; final-head Codex review clean and CodeRabbit verified its fix. Parent SPE-3337 remains In Progress.
