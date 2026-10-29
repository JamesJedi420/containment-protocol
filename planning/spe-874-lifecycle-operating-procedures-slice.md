# SPE-874 — Lifecycle operating procedures and permit controls

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** (PR #4485 @ `76b5ac07`) |
| **Issue** | [SPE-874](https://linear.app/spectranoir/issue/SPE-874/lifecycle-operating-procedures-and-permit-controls) |
| **Parent** | none (standalone) |
| **Branch** | `jamesdyedbq/spe-874-lifecycle-operating-procedures-and-permit-controls` |
| **Base main SHA** | `ede7d66c` |

## Delegated approval

**Date:** 2026-10-29  
**main SHA:** `ede7d66c`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-874  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-876 Done (#4484); clean main; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-3469 contradiction-only; SPE-873 large; SPE-877 umbrella; SPE-878 Medium large deltas; SPE-2749 Auto-Scrap parent; SPE-874 High lifecycle procedure/permit packets.
3. **Winner lines** — Priority High; no children; pure phase procedure + permit packets.
4. **Duplication** — not recentlyShipped; market licensed-handling attestation (PR #1534) is a prior narrow procurement fold-in and does not satisfy remaining lifecycle/permit ACs.
5. **Contradiction** — SPE-872/873/876/877/878 remain separate; do not rewrite market attestation.
6. **Eligibility** — exists Backlog; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-874.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/lifecycleOperatingProcedures.ts`
- Phase-differentiated procedure logic
- Deviation correction/avoidance steps
- Safe-work permits keyed to asset + time window + preconditions
- Procedure-set attestation freshness (stale without review)
- Targeted Vitest; no GameState mutation; do not reopen market licensed-handling attestation

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Market licensed-handling attestation | SPE-874 prior fold-in (PR #1534) | Already shipped procurement path; leave unchanged |
| Hazard analysis / change control | SPE-873 / SPE-878 | Separate owners |
| Pre-activation readiness | SPE-876 | Separate readiness gate |

## Validation

- `npm run test:run -- src/test/lifecycleOperatingProcedures.test.ts`
