# SPE-2362 — Branch continuity runtime validation hooks (slice 1)

One-page implementation plan. Optional follow-on from [SPE-2361](https://linear.app/spectranoir/issue/SPE-2361) harvest reconciliation closure.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2362 — Branch continuity runtime validation hooks (optional follow-on)](https://linear.app/spectranoir/issue/SPE-2362) |
| **Parent** | [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) — substrate Done; parent stays **Done**        |
| **Branch** | `spe-2362-branch-continuity-runtime-hooks-slice-1`                                                         |
| **Status** | **Shipped** — PR #2592 @ `5d5bc297`                                                                                |
| **Base `main` SHA** | `0b28e830`                                                                                          |

## Goal

Wire shipped branch-continuity validator into a bounded read-only dev seam via `buildBranchContinuityAuditReport`, using the explicit supplied-node adapter path only.

## Seam choice

**Developer overlay snapshot** (`buildDeveloperOverlaySnapshot`) — smallest read-only contract:

- Reuses existing dev-only inspection surface (not player UI)
- Avoids new `StabilityIssueCategory` values or `stabilityLayer.ts` mutations
- Optional `branchContinuityAuthoredNodes` overlay build option preserves explicit-supply boundary

## Prerequisite (on `main`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Path-facts validator | `src/domain/branchContinuity.ts` (SPE-1760 / SPE-2093)                 |
| GameState projection | `src/domain/branchContinuityProjection.ts` (SPE-1761)                  |
| Audit report helper  | `src/domain/branchContinuityAudit.ts` (SPE-1762)                       |
| Authored adapter     | `src/domain/branchContinuityAuthoring.ts` (SPE-1811)                   |
| Harvest fixtures     | `src/test/branchContinuityHarvestReconciliation.test.ts` (SPE-2361)    |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `src/domain/branchContinuityRuntimeHooks.ts`                       | Core `branchContinuity.ts` changes            |
| Dev overlay snapshot + section (`developerOverlayView.ts`, `DeveloperOverlay.tsx`) | New warning classes                           |
| `src/test/branchContinuityRuntimeHooks.test.ts`                    | GameState persistence keys                    |
| Slice doc (this file) + backlog handoff                            | `advanceWeek` / encounter orchestration       |
|                                                                    | Automatic authored-graph import               |
|                                                                    | SPE-854 bundle compose                        |
|                                                                    | SPE-2360 naming-hazard weekly orchestration   |
|                                                                    | SPE-2359 investigation UI                   |
|                                                                    | Parent SPE-1464 reopen                        |

## Acceptance

- [x] `buildBranchContinuityRuntimeAuditSnapshot` uses adapter → audit report with explicit nodes only
- [x] Inactive snapshot when no nodes supplied (no audit side effects)
- [x] Dev overlay surfaces audit via optional build options without mutating `GameState`
- [x] Integration test proves seam + neighbor `branchContinuity*.test.ts` regression green
- [x] `npm run lint` green

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Dedicated exploit-access content slice | Backlog grooming | Validator shipped; defer unless scoped slice owner exists |
| Stability-audit category integration | Future slice | Dev overlay chosen as smaller seam for slice 1 |
| Harvest index row for SCP-9995 | — | Backlog § Harvest reconciliation is authoritative |

## Validation

```bash
npm run test:run -- src/test/branchContinuityRuntimeHooks.test.ts
npm run test:run -- src/test/branchContinuity.test.ts src/test/branchContinuityAuthoring.test.ts src/test/branchContinuityAudit.test.ts src/test/branchContinuityProjection.test.ts src/test/branchContinuityHarvestReconciliation.test.ts
npm run test:run -- src/test/developerOverlayView.test.ts
npm run lint
```
