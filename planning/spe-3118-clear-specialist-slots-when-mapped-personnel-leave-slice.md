# SPE-3118 — Clear or rederive specialistOperatorSlots when mapped personnel leave

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-3118](https://linear.app/spectranoir/issue/SPE-3118/clear-or-rederive-specialistoperatorslots-when-mapped-personnel-leave)                                             |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-3114 authority dispositions (Done); SPE-3117 / SPE-3116 / SPE-3115 feed maps (Done); SPE-3113 persist slots (Done); SPE-3112 live feed (Done)                            |
| **Branch**          | `cursor/spe-3118-clear-specialist-slots-when-mapped-personnel-leave-6827`                                                                                                   |
| **Base `main` SHA** | `b09d1a74394446b8fc87112155c6625e4639e36f`                                                                                                                                  |

## Goal

At week-close, clear `GameState.specialistOperatorSlots` to absent when a present list matches the one-slot `PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS` shape and no mapped `investigator` agent / `analysis` staff remain, so a stale materialized cache cannot keep granting or stalling specialist labor after the roster no longer supports it.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relevant files    | `specialistLaborOperatorFeed.ts`; `advanceWeek.ts` workshop feed block; feed contract / advanceWeek / agent / staff map tests; SPE-3114 dispositions                                              |
| Current behavior  | Present production-shaped list is never cleared; maps write only when absent; absent → campaign roster                                                                                           |
| Expected behavior | Production-shaped present list + no mapped personnel → clear to absent; then maps may rewrite only when absent; `[]` and non-production shapes untouched                                         |
| Boundary          | Pure clear helper + week-close wire + targeted Vitest + slice/backlog. No new task pairs. No SCHEMA_REGISTRY. Do not reopen Done siblings. Do not close SPE-1052                                 |
| Risks             | Clearing intentional `[]`; overwriting non-production shapes; re-firing maps incorrectly after clear; treating two-slot campaign roster as production shape                                      |
| Validation        | `specialistLaborOperatorFeed.contract.test.ts`, `specialistLaborOperatorFeed.advanceWeek.test.ts`, agent/staff map contracts, lint, `npm run verify:backlog-handoff`                             |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`                                                                                                                   |

## Boundary

### In scope

- Pure helper `shouldClearStaleMappedProductionSpecialistOperatorSlots` beside existing derive helpers
- Week-close wire: clear stale production-shaped lists to absent before map derive / campaign resolve
- Compose with SPE-3115 / SPE-3116 absent-only writes (maps rewrite only when field is absent after clear)
- Targeted Vitest + backlog handoff + this slice doc

### Out of scope

- Stat-to-band / competency-profile consume (SPE-1059 / SPE-2266)
- Further department-task → specialist-task pairs
- New persisted provenance field / SCHEMA_REGISTRY change
- Reopening SPE-3114 / SPE-3117 / SPE-3116 / SPE-3115 / SPE-3113 / SPE-3112 / SPE-3110 / SPE-3109 / SPE-1058
- Closing SPE-1052

## Seam

Call `shouldClearStaleMappedProductionSpecialistOperatorSlots` first. When it returns true, treat the field as absent for that tick’s resolve path and delete it on the output state. Then run `deriveArchiveAnalystSlotsFromMappedPersonnel` (absent-only write) and `resolveCampaignSpecialistLaborOperatorSlots`. Clear requires no mapped personnel, so maps cannot re-fire on the same tick after a clear. Present `[]` and non-production shapes (including the two-slot campaign roster and novice bands) never clear.

## Acceptance

- [x] Present archive_analyst-only production-shaped list + no matching investigator / `analysis` staff → field cleared to absent at week-close; campaign roster used for that tick’s resolve path
- [x] Present `[]` is not silently rewritten into the campaign roster
- [x] Matching mapped personnel still present → present list left untouched (SPE-3115 / SPE-3116 absent-only write preserved)
- [x] Parent SPE-1052 remains **Backlog**; SPE-3114 remains Done

## Deferred

| Item or mechanic                                | Owner or prerequisite | Why deferred                                      |
| ----------------------------------------------- | --------------------- | ------------------------------------------------- |
| Stat-to-band / competency-profile consume       | SPE-1059 / SPE-2266   | Fixed competent/fit bands only today              |
| Further department-task → specialist-task pairs | later SPE-1052 child  | Outside clear-on-leave boundary                   |
| Automation / succession / priority-conflict     | later SPE-1052 child  | Out of this cache-clear boundary                  |

## Validation

- Targeted Vitest: `src/test/specialistLaborOperatorFeed.contract.test.ts`, `src/test/specialistLaborOperatorFeed.advanceWeek.test.ts`
- Related: `src/test/specialistLaborAgentRoleMap.contract.test.ts`, `src/test/specialistLaborStaffRoleMap.contract.test.ts`
- ESLint on touched files
- `npm run verify:backlog-handoff`
