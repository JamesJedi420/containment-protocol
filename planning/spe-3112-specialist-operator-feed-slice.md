# SPE-3112 — Live specialist operator feed for workshop week-close

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-3112](https://linear.app/spectranoir/issue/SPE-3112/live-specialist-operator-feed-for-workshop-week-close)                                                             |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-3110 week-close wire (Done — do not reopen); SPE-3109 adapter (Done); SPE-1058 registry (Done)                                                                         |
| **Branch**          | `cursor/spe-3112-specialist-operator-feed-fe23`                                                                                                                             |
| **Base `main` SHA** | `692b6c255e6b469143dc954760645c2828618f58`                                                                                                                                  |

## Goal

Build the SPE-3110 `gateInputsByWorkOrderId` map from an authored specialist-operator fixture and pass it into `advanceWeek`'s workshop tick and completion registration. No new GameState field. No change to SPE-1058 / SPE-3109 / SPE-3110 gate or adapter semantics.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relevant files    | `departmentWorkshopSpecialistLaborWeekClose.ts`; `advanceWeek.ts` workshop block; `specialistLaborRegistry.ts` slots; `departmentWorkshopQueue.ts` trailing gate arg                           |
| Current behavior  | SPE-3110 accepts a caller-owned gate map. Campaign `advanceWeek` omits it, so `records_review` never stalls or degrades on specialist labor                                                     |
| Expected behavior | Authored slots project onto `records_review` → `archive_classification`. `advanceWeek` passes that map into the tick and into `deriveSpecialistLaborQualityConditionsByWorkOrderId`            |
| Boundary          | Pure projector + production fixture + `advanceWeek` call + contract tests + slice/backlog docs. No GameState field. No agent/staff role mapping. No registry or adapter semantic change       |
| Risks             | Treating an absent feed as operable; treating an empty present roster as omit; mapping agents onto role families; moving completion registration ahead of facility/integrity composition       |
| Validation        | `src/test/specialistLaborOperatorFeed.contract.test.ts`, related workshop tests, lint, `npm run verify:backlog-handoff`                                                                         |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; SPE-3110 Deferred owner retarget. No `SCHEMA_REGISTRY` change                                                   |

## Boundary

### In scope

- `projectSpecialistLaborGateInputsByWorkOrderId` in `src/domain/specialistLaborOperatorFeed.ts`
- One authored pair: department task `records_review` → specialist task `archive_classification`
- `undefined` slots return `undefined` (omit the map). A present list, including `[]`, copies onto every valid `records_review` work order. Other task types omit their keys
- Production fixture: one `archive_analyst` / `competent` / `fit` slot
- `advanceWeek` passes the projected map as the existing trailing tick argument and into `deriveSpecialistLaborQualityConditionsByWorkOrderId`. Registration stays on `outputWeeklyState` after the tick write
- Targeted Vitest + backlog handoff

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- New `advanceWeek` argument
- Mapping `GameState.agents` or `staff` onto specialist role families
- Changes to `projectSpecialistLaborGate`, `mapSpecialistLaborGateToWorkshopConsume`, or SPE-3110 stall-vs-complete behavior
- Further department-task → specialist-task pairs
- Automation / succession / priority-conflict / clearance / per-person roster
- Closing SPE-1052 or SPE-1028; reopening SPE-3109, SPE-1058, or SPE-3110

## Seam

Callers pass work orders plus operator slots. `undefined` slots, a non-record work-order payload, or zero valid `records_review` ids return `undefined`. A present slot list (including empty) builds a frozen work-order-keyed `SpecialistLaborGateInput` map with `taskId: 'archive_classification'` and that same slot list. Malformed ids are skipped. Campaign `advanceWeek` calls the projector with `PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS` and passes the result to the existing tick and quality-derive arguments.

## Acceptance

- [x] `undefined` slots omit the map; week-close still completes the order
- [x] Production `competent` / `fit` `archive_analyst` completes `records_review` without `poor_specialist_condition`
- [x] Novice exact-role slots complete with `poor_specialist_condition`
- [x] Present `[]` or a wrong role stalls that `records_review` order; `completedWork` stays unchanged
- [x] A non-`records_review` sibling still completes
- [x] Facility poor room on `department:biohazard-response` stays `poor_room_contamination` when that order is not `records_review`
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-3110 / SPE-3109 / SPE-1058 stay Done

## Deferred

| Item or mechanic                                                         | Owner or prerequisite                                                                 | Why deferred                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| GameState specialist roster / SCHEMA_REGISTRY                            | later SPE-1052 child                                                                  | Authored fixture is enough to pass the existing transient gate map           |
| Agent or staff → specialist role-family mapping                         | later SPE-1052 child                                                                  | `AgentRole` does not match `SpecialistRoleFamily`; do not invent the bridge |
| Further department-task → specialist-task pairs beyond `records_review` | later SPE-1052 child                                                                  | One explicit pair is the smallest live feed                                  |
| Automation mitigation path (reduces labor dependency + new failure mode) | later SPE-1058 child or SPE-1052 child                                                | Full SPE-1058 AC remains; out of this feed boundary                          |
| Training / succession / cross-training long-term capability change       | later SPE-1058 child; progression authority remains SPE-1059 / SPE-14                 | Feed copies current slots; it does not grow or lose capability               |
| Priority-conflict arbitration between competing specialist tasks         | later SPE-1058 child or SPE-1052 child                                                | One slot list is copied onto every mapped work order                         |
| Clearance / psychological-fit / trainee permission gates                 | later SPE-1058 child; clearance owners SPE-1046 / SPE-2078                            | Availability bands already handled in SPE-1058 registry                      |

Parent SPE-1052 remains **Backlog**. Do not treat GitHub linkback alone as umbrella completion.

## Validation

- Targeted Vitest: `src/test/specialistLaborOperatorFeed.contract.test.ts`, `src/test/specialistLaborOperatorFeed.advanceWeek.test.ts`
- Related: `src/test/departmentWorkshopSpecialistLaborWeekClose.contract.test.ts`
- ESLint on touched files
- `npm run verify:backlog-handoff`
