# SPE-1119 — canonical staff-time telemetry

Codex continues the authorized loop after #4903 closeout. Base `a60353df348e91e2b6cd3593065ac77bb2ec2e22`; branch `codex/spe-1119-staff-time-telemetry`. Fresh preflight ready 2026-11-06T22:18:17.938Z: clean synchronized main, no PRs, SPE-1119 In Progress/no blockers. Existing SPE-3291 owner and source inspected; no scope or relationship changes.

## Source and boundary

The existing optional before-close capture calls `queryStaffTimeAllocation` and copies its unavailable flag, canonical capacity totals/reason, available staff IDs, active commitments and usable commitment IDs. The existing analyzer retains the detached projection in each week's history. Event version 5 and analysis version 4 change together; historical evidence remains pinned to its original revision.

Capacity `available` is the capacity owner's headcount availability, while `availableIds` is the allocation query's remaining eligible pool. They must not be conflated. Active claims may be unusable after post changes; the projection retains both facts. Invalid allocation data remains unavailable rather than becoming a free pool. Current-window claims include their recorded displaced alternative; telemetry neither invents alternatives nor infers that an absent record proves no opportunity cost.

No allocation mutation, automatic staff selection, personnel formula, facility gate, generic scarcity band, surplus threshold, player information disclosure or saved-game change. No claim that the default harness exercises every allocation consumer. Other resource classes and broader SPE-1119 operational criteria remain open.

## Evidence plan

The applicable integration is canonical allocation query → before-close observer → deterministic analysis history. Actual harness capture tests are separate from constructed canonical-post commit/release and invalid-source fixtures. Verify query equality, displacement, unusable active claims, valid-zero versus unavailable, nested detachment and repeatability. Existing observer/default equivalence tests protect simulation behavior. Persistence is inapplicable to ephemeral capture; canonical ledger persistence remains its existing owner's responsibility.

Six direct audit passes cover scope/source authority, edge states, deterministic isolation and audience, producer/consumer regression, versioned docs and cleanup. This is a bounded single-source observation increment; no new substantial Hermes synthesis, Freebuff, frontend behavior or package changes. Node 22.23.4 validation passed: 47 targeted tests/four files (9.68s); full strict-console forks suite 11,015 tests/1,012 files (528.46s); 24 campaign browser checks (4.3m) and five synthetic-error browser checks (14.3s), no retries. Explicit six-path requirements passed backlog, lint, unit tests, Vite build, browser checks and typecheck (zero diagnostics). Literal production build passed after a test-only staff-union narrowing fix. Global advisory formatting excluded, not claimed green. Independent review and hosted CI pending.
