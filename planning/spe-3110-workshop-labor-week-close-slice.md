# SPE-3110 — Week-close wire of specialist labor workshop-consume adapter

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-3110](https://linear.app/spectranoir/issue/SPE-3110/week-close-wire-of-specialist-labor-workshop-consume-adapter)                                                       |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-3109 adapter (Done — do not reopen); SPE-1058 registry (Done — do not reopen); SPE-2768 quality axis; SPE-1028 workshop queues (tick path only)                          |
| **Branch**          | `cursor/spe-3110-workshop-labor-week-close-fe23`                                                                                                                            |
| **Base `main` SHA** | `680dcd43c2eb02bb3d533b0b45f93aa45d941293`                                                                                                                                  |

## Goal

Wire SPE-3109 `mapSpecialistLaborGateToWorkshopConsume` and SPE-1058 `projectSpecialistLaborGate` into the existing department-workshop week-close / tick path so stalled or degraded specialist gates affect live consume outcomes without changing registry or adapter semantics.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `specialistLaborWorkshopConsume.ts`; `specialistLaborRegistry.ts`; `departmentWorkshopQueue.ts` tick; `departmentWorkshopLiveFacilitySafety.ts` registrar; `advanceWeek.ts` workshop block    |
| Current behavior  | Pure adapter exists; week-close tick always advances work and grades with default/facility specialist axes; no gate stall                                                                       |
| Expected behavior | Optional caller-owned gate map: present blocked entries stall (no work units / no receipt); allowed entries set only `specialistCondition`; omit map → today's path                             |
| Boundary          | Week-close helper + optional trailing tick arg + contract tests + slice/backlog docs. No GameState roster; no `advanceWeek` arg; no SPE-1058/3109 semantic change                               |
| Risks             | Treating stall as completing poor quality; new GameState field; overwriting facility room/equipment axes; closing SPE-1052                                                                      |
| Validation        | `src/test/departmentWorkshopSpecialistLaborWeekClose.contract.test.ts`, related workshop tests, lint, `npm run verify:backlog-handoff`                                                          |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                                                                                     |

## Boundary

### In scope

- `runDepartmentWorkshopSpecialistLaborWeekClose` in `src/domain/departmentWorkshopSpecialistLaborWeekClose.ts`
- Optional last arg `gateInputsByWorkOrderId` on `processDepartmentWorkshopTick` / `advanceDepartmentWorkshopQueue`
- Present gate entries: project → map; `consumeAllowed === false` leaves active item at same `completedWork` (no receipt)
- Allowed gates: set only `specialistCondition` into completion quality conditions; facility composers keep room/equipment
- `advanceWeek` calls the tick with staging projection and **omits** the gate map; completion registration stays on post-close `outputWeeklyState` so live integrity/facility axes remain authoritative
- Targeted Vitest + backlog handoff

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- New `advanceWeek` argument
- Mapping agents/staff onto specialist role families
- Changes to `projectSpecialistLaborGate` or `mapSpecialistLaborGateToWorkshopConsume` semantics
- Automation / succession / priority-conflict / clearance / per-person roster
- Closing SPE-1052 or SPE-1028; reopening SPE-3109 or SPE-1058

## Seam

Callers may pass a work-order-keyed gate-input map into the week-close helper (or the tick's last optional arg). Absent map / absent work-order id → today's advance and grade. Present id (including `undefined` / malformed) → SPE-1058 project → SPE-3109 map. Blocked consume adds no work units and emits no completion. Allowed consume completes and supplies only `specialistCondition` to the existing facility quality registrar. Campaign `advanceWeek` omits the gate map (no persisted roster yet).

## Acceptance

- [x] Operable gate completes; receipt is not `poor_specialist_condition`
- [x] Degraded gate completes with `poor_specialist_condition` when other required axes are `good` (unmapped department)
- [x] Stalled gate does not complete; `completedWork` unchanged; later operable call can finish the same order
- [x] Present undefined / malformed gate entries fail closed (stall that order only)
- [x] Absent map / absent work-order id keep today's completion
- [x] Sibling in the same department still completes when only one id is stalled
- [x] Facility-owned poor room on `department:biohazard-response` is not overwritten by an operable specialist `good`
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-3109 / SPE-1058 stay Done

## Deferred

| Item or mechanic                                                         | Owner or prerequisite                                                                 | Why deferred                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Live specialist operator feed at week-close                              | [SPE-3112](https://linear.app/spectranoir/issue/SPE-3112/live-specialist-operator-feed-for-workshop-week-close) | Authored fixture projects `records_review` into this wire's gate map. GameState roster stays deferred on SPE-3112 |
| Automation mitigation path (reduces labor dependency + new failure mode) | later SPE-1058 child or SPE-1052 child                                                | Full SPE-1058 AC remains; out of week-close wire boundary                             |
| Training / succession / cross-training long-term capability change       | later SPE-1058 child; progression authority remains SPE-1059 / SPE-14                 | Wire does not grow or lose capability                                                 |
| Priority-conflict arbitration between competing specialist tasks         | later SPE-1058 child or SPE-1052 child                                                | Wire maps one gate input per work order                                               |
| Clearance / psychological-fit / trainee permission gates                 | later SPE-1058 child; clearance owners SPE-1046 / SPE-2078                            | Availability bands already handled in SPE-1058 registry                               |

Parent SPE-1052 remains **Backlog**. Do not treat GitHub linkback alone as umbrella completion.

## Validation

- Targeted Vitest: `src/test/departmentWorkshopSpecialistLaborWeekClose.contract.test.ts`
- Related: `src/test/specialistLaborWorkshopConsume.contract.test.ts`, `src/test/departmentWorkshopLiveFacilityQuality.integration.test.ts`, `src/test/departmentWorkshopPersistence.test.ts`
- ESLint on touched files
- `npm run verify:backlog-handoff`
