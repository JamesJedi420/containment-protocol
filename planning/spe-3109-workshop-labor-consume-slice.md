# SPE-3109 — Pure workshop-consume adapter over specialist labor gate

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **In Progress**                                                                                                                                                             |
| **Linear**          | [SPE-3109](https://linear.app/spectranoir/issue/SPE-3109/pure-workshop-consume-adapter-over-specialist-labor-gate)                                                           |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-1058 registry (Done — do not reopen); SPE-2768 workshop quality axis; SPE-1028 workshop queues (read consume inputs only — do not wire tick)                           |
| **Branch**          | `cursor/spe-3109-workshop-labor-consume-db59`                                                                                                                               |
| **Base `main` SHA** | `d7a4815bd2ecbfaacb02708563c910799dfff92b`                                                                                                                                  |

## Goal

Add a pure deterministic adapter that maps a `projectSpecialistLaborGate` projection into workshop-consume inputs the existing department workshop already understands, so a stalled or degraded specialist gate changes consume outcome without a new persisted field or a week-close wire.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/specialistLaborRegistry.ts` (gate projection); `src/domain/departmentWorkshopQueue.ts` (`DepartmentWorkshopConditionLevel`, `resolveDepartmentWorkshopCompletionQuality`)         |
| Current behavior  | SPE-1058 projects `operable` / `degraded` / `stalled` but nothing maps those outcomes onto SPE-2768 workshop specialist consume inputs                                                           |
| Expected behavior | Caller-owned gate projection → immutable consume view: operable→good+allow, degraded→poor+allow, stalled/undefined→block; other quality axes stay caller-owned                                  |
| Boundary          | Pure adapter module + contract tests + slice doc + backlog handoff. No GameState, week-close, `processDepartmentWorkshopTick` / `advanceWeek` arg, registry semantic change, or automation      |
| Risks             | Treating stall as completing poor quality; inventing good condition on fail-closed; overwriting caller input/room axes; reopening SPE-1058; closing SPE-1052                                    |
| Validation        | `src/test/specialistLaborWorkshopConsume.contract.test.ts`, lint on touched files, `npm run verify:backlog-handoff`                                                                              |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; SPE-1058 Deferred owner retarget. No `SCHEMA_REGISTRY` change                                                   |

## Boundary

### In scope

- `mapSpecialistLaborGateToWorkshopConsume` in `src/domain/specialistLaborWorkshopConsume.ts`
- Map gate outcomes onto SPE-2768 `DepartmentWorkshopConditionLevel` (`good` \| `poor`) plus `consumeAllowed`
- Fail-closed `undefined` / malformed projections (no consume grant, no invented good condition)
- Stalled (including infrastructure-present and adjacent-rejected) blocks consume
- Degraded specialist axis composes with existing `resolveDepartmentWorkshopCompletionQuality` → `poor_specialist_condition` when other required axes are `good`
- Targeted Vitest contract + backlog handoff updates

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- New argument to `processDepartmentWorkshopTick` or `advanceWeek`
- Week-close wire
- Changes to `projectSpecialistLaborGate` semantics or SPE-1058 registry behavior
- Automation mitigation path
- Training / succession / cross-training
- Priority-conflict arbitration
- Clearance / psychological-fit gates beyond availability bands already in the registry
- Per-person simulation
- Closing SPE-1052, SPE-1028, or SPE-1027
- Reopening SPE-1058

## Seam

Callers pass a `SpecialistLaborGateProjection` (or `undefined` / malformed). `mapSpecialistLaborGateToWorkshopConsume` returns a frozen `{ consumeAllowed, specialistCondition, gateOutcome }`. When `consumeAllowed` is true, callers compose `specialistCondition` into existing SPE-2768 quality conditions without this adapter touching input/room/dependency/equipment/reagent. When blocked, `specialistCondition` is `null`.

## Acceptance

- [x] `operable` → `specialistCondition: 'good'` and consume allowed
- [x] `degraded` → `specialistCondition: 'poor'` and consume allowed; with other required axes `good`, `resolveDepartmentWorkshopCompletionQuality` reports `poor_specialist_condition`
- [x] `stalled` → consume blocked; not a completing poor-quality tick
- [x] `undefined` / malformed → fail closed (no consume, no invented good)
- [x] Infrastructure-present stalled and adjacent-rejected stalled stay blocked
- [x] Other quality axes remain caller-owned
- [x] Byte-stable frozen output
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-1058 stays Done

## Deferred

| Item or mechanic                                                         | Owner or prerequisite                                                                                                        | Why deferred                                                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Week-close / GameState wire of specialist gate into workshop tick        | later SPE-1052 child                                                                                                         | This slice owns pure adapter only; no `processDepartmentWorkshopTick` / `advanceWeek` |
| Automation mitigation path (reduces labor dependency + new failure mode) | later SPE-1058 child or SPE-1052 child                                                                                       | Full SPE-1058 AC remains; out of adapter boundary                                     |
| Training / succession / cross-training long-term capability change       | later SPE-1058 child; progression authority remains SPE-1059 / SPE-14                                                        | Adapter does not grow or lose capability                                              |
| Priority-conflict arbitration between competing specialist tasks         | later SPE-1058 child or SPE-1052 child                                                                                       | Adapter maps one gate projection at a time                                            |
| Clearance / psychological-fit / trainee permission gates                 | later SPE-1058 child; clearance owners SPE-1046 / SPE-2078                                                                   | Availability bands already handled in SPE-1058 registry                               |

Parent SPE-1052 remains **Backlog**. Do not treat GitHub linkback alone as umbrella completion.

## Validation

- Targeted Vitest: `src/test/specialistLaborWorkshopConsume.contract.test.ts`
- ESLint on touched files
- `npm run verify:backlog-handoff`
