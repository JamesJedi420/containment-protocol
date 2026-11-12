# SPE-3337 — Portable follow-up evidence and human projection

| Field      | Value                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| **Status** | **Done**                                                                           |
| Owner      | SPE-3337; shared-system-owned, Containment Protocol Tooling / Developer Experience |
| Branch     | `codex/spe-3337-portable-followups`                                                |
| Base main  | `e37dbbe6982dbd015ed4b22425d97ec306ede93b`                                         |

## Boundary and plan

Complete the remaining original portable handoff reporting boundary: preserve the named issue/parent/slice/branch/base/dependency snapshot, classify source-attributed follow-ups, and derive a human-readable view from the same evaluated machine envelope. Keep verified in-boundary deferrals, candidate discoveries and authorized-and-actually-applied scope distinct. Consume current observations from existing authorities; never decide new scope approval or perform writes.

Add follow-up schema/projection and Markdown rendering modules, integrate them with the existing preflight, cover adversarial evidence and actual CLI output, update operator guidance and backlog projections. No new authority contract, transport, queue, candidate ledger, lifecycle writer, dependencies or campaign state. Caller-collected observations require actual source verification; the tool cannot manufacture that proof.

## Acceptance and evidence

Fresh Linear state was In Progress with no blockers or parent. Canonical main and managed worktree were clean/synchronized at the base revision with no open PRs; existing CLI start returned ready before branching.

Verify same-owner out-of-boundary findings, pending Phase 1, stale/missing/contradictory authorization or application, actual issue/owner mismatch, unknown precision, deterministic ordering, all workstreams, immutable input and JSON/Markdown parity. Preserve the existing Linear/merged-GitHub disagreement as unknown rather than silently closing the issue. Six audit passes cover scope/integration, edges, isolated deterministic state, regressions, docs/projections and cleanup. Run selected SPE-3348 validators and independent full-diff review before merge; reassess the full parent acceptance separately after merge.

Focused preflight/selection run: 58 passed. The initial merged-GitHub fixture expectation was corrected to the existing `unknown` lifecycle-conflict outcome; production readiness was not weakened. Live source read at `2026-11-06T10:51:09Z` and both CLI formats retained ready read diagnostics, unknown historic designation time and the current review/merge acceptance as a verified in-boundary deferral. Overall start stayed blocked on the attached dirty checkout. Synthetic applied-scope fixtures establish classification behavior only; no new scope was applied to Linear for testing.

Selected backlog, environment, lint, requirements-model, preflight and bundle checks passed; advisory typecheck reported zero diagnostics. The first default-parallel application run passed 10,961 tests with one navigation-heading lookup failure. That test passed in isolation, then the full unchanged suite passed all 1,007 files and 10,962 tests with `npm run test:run -- --maxWorkers=4` (162.44 seconds). No test or application code was changed to obtain that result. Global formatting drift remains advisory; all touched files pass. The audit also rejects pending phases for every actor while allowing separately observed Cursor authority, and retains authority provenance in the source-reference index.

Parent acceptance audit must combine this slice with PR #4630 (source freshness, branch/base/session preflight), #4874 (environment and Copilot adapter), #4875 (MCP diagnostics), and #4876 (designation provenance). Confirm independent review/current-head CI, clean synchronized main and this slice's machine/human evidence before marking SPE-3337 complete. No gameplay evidence is claimed because the entire boundary is developer tooling outside campaign state.

Prior unsupported Hermes mapping retains documented direct fallback; short checks run directly. Freebuff remains disabled. No new issue, relationship or durable scope is created by this plan.

## Final merge and parent acceptance

PR #4877 merged at `9567e838a65947c2940f3972fb102ad54ce74119`; final-head Codex review was clean and Amazon Q found no blocking defects. CI 42207353841 passed every selected required validator, all 1,007 application test files, bundle and browser checks. Main was clean and synchronized in-session. The combined acceptance audit verified all five delivery PRs against the original and extended issue boundary; SPE-3337 is Done in Linear with the full source/validation/limitations record. No remaining implementation acceptance or in-boundary deferral was identified. The caller still revalidates authoritative observations; no new transport, approval engine, writer or gameplay state is claimed.
