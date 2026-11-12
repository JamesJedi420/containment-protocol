# SPE-2487 — Branch continuity stability-audit category (slice 1)

One-page implementation plan. Optional follow-on from [SPE-2362](https://linear.app/spectranoir/issue/SPE-2362) deferred table.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2487 — Branch continuity stability-audit category (slice 1)](https://linear.app/spectranoir/issue/SPE-2487) |
| **Parent** | [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) — substrate Done; parent stays **Done**        |
| **Branch** | `spe-2487-branch-continuity-stability-audit-category-slice-1`                                              |
| **Status** | **Shipped** — PR #2894 @ `aad88cff`                                                                                |
| **Base `main` SHA** | `9358d867`                                                                                          |

## Goal

Project `buildBranchContinuityRuntimeAuditSnapshot` into a read-only `stabilityLayer.ts` stability-audit category for dev/stability tooling.

## Seam choice

**Developer overlay stability projection** — extends slice 1 seam:

- Reuses `buildDeveloperOverlaySnapshot` optional `branchContinuityAuthoredNodes` build option
- Merges `branch-continuity` category issues into overlay `stability` summary via `appendStabilityIssues`
- Keeps explicit-supply boundary: inactive snapshot emits zero stability issues

## Prerequisite (on `main`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Runtime audit hook   | `src/domain/branchContinuityRuntimeHooks.ts` (SPE-2362)                |
| Dev overlay seam     | `src/features/developer/developerOverlayView.ts` (SPE-2362)            |
| Stability layer      | `src/domain/stabilityLayer.ts`                                         |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `branch-continuity` `StabilityIssueCategory`                       | Core `branchContinuity.ts` changes            |
| `buildBranchContinuityStabilityIssues` + `appendStabilityIssues`   | GameState persistence keys                    |
| Dev overlay stability merge                                        | `advanceWeek` / encounter orchestration       |
| `src/test/branchContinuityRuntimeHooks.test.ts` extensions         | Automatic authored-graph import               |
| `src/test/stabilityLayer.test.ts` category unit test               | Player UI                                     |
| Slice doc (this file)                                              | Parent SPE-1464 reopen                        |

## Acceptance

- [x] `buildBranchContinuityStabilityIssues` maps active runtime audit snapshot → `branch-continuity` stability issues
- [x] Inactive snapshot emits zero stability issues (no false positives)
- [x] Dev overlay `stability` summary includes branch-continuity category when explicit nodes supplied
- [x] Deterministic: repeated builds byte-identical for same inputs
- [x] Integration tests + neighbor regression green
- [x] `npm run lint` green

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Modifiable-pack UI / weekly orchestration | [SPE-2486](https://linear.app/spectranoir/issue/SPE-2486) | Publish automation integration for pack import — out of dev/stability tooling boundary |
| Publish automation integration for pack import | Backlog grooming | Documented in SPE-2486 slice scope |
| Dedicated exploit-access content slice | Backlog grooming | Validator shipped; defer unless scoped slice owner exists |

## Validation

```bash
npm run test:run -- src/test/branchContinuityRuntimeHooks.test.ts
npm run test:run -- src/test/stabilityLayer.test.ts
npm run test:run -- src/test/branchContinuity.test.ts src/test/branchContinuityAuthoring.test.ts src/test/branchContinuityAudit.test.ts src/test/branchContinuityProjection.test.ts src/test/branchContinuityHarvestReconciliation.test.ts
npm run test:run -- src/test/developerOverlayView.test.ts
npm run lint
```
