# SPE-1464 — Branch continuity harvest reconciliation closure (slice 1)

One-page implementation plan. Parent [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) stays **Done** — validator substrate shipped via SPE-1760 → SPE-1761 → SPE-1762 → SPE-1811 → SPE-2093.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2361 — Branch continuity harvest reconciliation closure (slice 1)](https://linear.app/spectranoir/issue/SPE-2361) |
| **Parent** | [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) — substrate Done; runtime hooks deferred to [SPE-2362](https://linear.app/spectranoir/issue/SPE-2362) |
| **Branch** | `spe-1464-branch-continuity-harvest-reconciliation-slice-1`                                                |
| **Status** | **Shipped** — PR #2591 @ `4060efd1`                                                                                |
| **Base `main` SHA** | `1b5c164845d59c1b37dfb95786aeb582b5809a28`                                                          |

## Goal

Close backlog #1 (SCP-9995 harvest reconciliation follow-up) by documenting how batch-9995 themes map to shipped branch-continuity warning classes and locking that mapping with targeted regression fixtures. Do not rebuild the validator.

## Prerequisite (on `main`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Path-facts validator | `src/domain/branchContinuity.ts` (SPE-1760 / SPE-2093)                 |
| GameState projection | `src/domain/branchContinuityProjection.ts` (SPE-1761)                  |
| Audit report helper  | `src/domain/branchContinuityAudit.ts` (SPE-1762)                       |
| Authored adapter     | `src/domain/branchContinuityAuthoring.ts` (SPE-1811)                   |
| Acceptance fixtures  | `src/test/branchContinuity*.test.ts`                                   |

## Harvest theme → warning class mapping (batch-9995)

| Harvest theme (backlog § Harvest reconciliation) | Shipped warning class | Fixture anchor |
| --- | --- | --- |
| Layered operational truth / map | `player_awareness_leak` | Hidden simulation event in `simulationTruth.hiddenEventIds` assumed player-known |
| Access via edge cases | `missing_seed_prerequisite` | `requiredSeedValues` exact gate (not presence-only `anyRequiredSeedKeys`) |
| Contradiction checks / stale institutional claims | `stale_official_claim` | Node cites superseded official claim after active correction |
| Valid authored continuation | _(zero warnings)_ | Path facts satisfy node requires + assumes |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `src/test/branchContinuityHarvestReconciliation.test.ts`           | New validator module or warning classes       |
| `planning/backlog.md` harvest rows + active queue handoff          | Runtime hooks (`advanceWeek`, encounters)     |
| Slice doc (this file)                                              | Developer overlay / player-facing UI          |
| Linear hygiene: SPE-1760 → Done; child SPE-2362 for deferred hooks | GameState persistence keys                    |
|                                                                    | SPE-854 bundle compose chain                  |
|                                                                    | SPE-2360 naming-hazard weekly orchestration   |
|                                                                    | SPE-2359 investigation UI substitution        |

## Acceptance

- [x] Harvest-themed fixtures prove `player_awareness_leak`, `missing_seed_prerequisite`, `stale_official_claim`, and zero-warning regression via `validateBranchContinuity` / `buildBranchContinuityAuditReport`
- [x] Fixtures are read-only (no authored-content mutation assertions)
- [x] `planning/backlog.md` active queue no longer lists SPE-1464 as #1; harvest row 75 reflects shipped validator
- [x] Shipped table includes branch-continuity substrate row
- [x] `npm run test:run -- src/test/branchContinuityHarvestReconciliation.test.ts` green
- [x] Neighbor tests (`branchContinuity*.test.ts`) + `npm run lint` green

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Runtime validation hooks | [SPE-2362](https://linear.app/spectranoir/issue/SPE-2362) | Out of reconciliation boundary; optional dev/audit surfacing |
| Dedicated exploit-access content slice | [SPE-2397](https://linear.app/spectranoir/issue/SPE-2397) — **closed** | Grooming deferral closure; no mechanics slice unless explicitly scoped |
| Harvest index row for SCP-9995 | — | Backlog § Harvest reconciliation is authoritative; no separate `*-harvest.md` batch doc for this closure |

## Validation

```bash
npm run test:run -- src/test/branchContinuityHarvestReconciliation.test.ts
npm run test:run -- src/test/branchContinuity.test.ts src/test/branchContinuityAuthoring.test.ts src/test/branchContinuityAudit.test.ts src/test/branchContinuityProjection.test.ts
npm run lint
```
