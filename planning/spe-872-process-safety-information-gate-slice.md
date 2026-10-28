# SPE-872 — Process safety information gate

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-872](https://linear.app/spectranoir/issue/SPE-872/process-safety-information-gate) |
| **Parent** | none (standalone) |
| **Branch** | `jamesdyedbq/spe-872-process-safety-information-gate` |
| **Base main SHA** | `1dbc2230` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `1dbc2230`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-872  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-870 Done (#4482 @ `1dbc2230`); clean main; no open PRs; manifest inProgress cleared to SPE-872.
2. **Candidates compared** — SPE-3338 tooling IP (skip); SPE-3469 contradiction-only (skip); SPE-873 large multi-delta HAZOP (skip); SPE-877 parent umbrella with children (skip); SPE-876 High compact alternate; SPE-872 High compact PSI gate after SPE-870.
3. **Winner lines** — Priority High; no blockers; no children; pure prerequisite gate packets; architectural next after coverage.
4. **Duplication** — not recentlyShipped; SPE-870 covers class/quantity triggers only, not baseline information readiness.
5. **Contradiction** — SPE-873 owns hazard-analysis workflow; SPE-877 owns integrity; SPE-876 owns startup readiness; this slice owns information completeness only.
6. **Eligibility** — exists Backlog; not umbrella; acceptance fits one slice; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-872.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/processSafetyInformationGate.ts`
- Baseline substance/technology/equipment prerequisite packets
- Technology profiles with safe limits + deviation consequences
- Legacy assets remain valid only with active safe-operation proof
- Deep hazard-review gate blocked until prerequisites complete
- Targeted Vitest; no GameState; no HAZOP/integrity/startup simulator

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Process hazard analysis workflow | SPE-873 | Explicit SPE-872 distinction |
| Critical equipment integrity | SPE-877 | Separate owner |
| Pre-activation readiness | SPE-876 | Downstream of information gate |
| Live week-close wire | follow-up | Projection/eval only this slice |

## Validation

- `npm run test:run -- src/test/processSafetyInformationGate.test.ts`
