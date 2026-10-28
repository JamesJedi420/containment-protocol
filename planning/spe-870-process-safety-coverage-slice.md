# SPE-870 — Threshold-triggered process safety coverage

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-870](https://linear.app/spectranoir/issue/SPE-870/threshold-triggered-process-safety-coverage) |
| **Parent** | none (standalone) |
| **Branch** | `jamesdyedbq/spe-870-threshold-triggered-process-safety-coverage` |
| **Base main SHA** | `0e8e7995` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `0e8e7995`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-870  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-2211 Done (#4479); SPE-3458 Done (#4481); clean main; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-698 Medium larger; SPE-3469 contradiction-only; SPE-870 High compact.
3. **Winner lines** — Priority High; no blockers; pure class+threshold coverage.
4. **Duplication** — not recentlyShipped.
5. **Contradiction** — no HAZOP/integrity ownership; coverage packets only.
6. **Eligibility** — exists; In Progress; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-870.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/processSafetyCoverage.ts`
- Named hazard-class coverage and/or quantity thresholds
- Legible trigger basis + threshold proximity
- Targeted Vitest; no GameState; no integrity/HAZOP simulator

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Detailed hazard analysis / equipment integrity | adjacent containment owners | Explicit SPE-870 distinction |
| Live week-close safety audit wire | follow-up | Projection/eval only this slice |

## Validation

- `npm run test:run -- src/test/processSafetyCoverage.test.ts`
