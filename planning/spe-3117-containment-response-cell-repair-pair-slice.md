# SPE-3117 — Map containment_response onto containment_cell_repair in the workshop week-close feed

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                             |
| **Linear**          | [SPE-3117](https://linear.app/spectranoir/issue/SPE-3117/map-containment-response-onto-containment-cell-repair-in-the-workshop)                                             |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-3116 staff map (Done — deferred pair retarget; do not reopen); SPE-3114 contradiction check (Backlog — do not close); SPE-3113 persist slots (Done); SPE-3112 live feed (Done) |
| **Branch**          | `cursor/spe-3117-containment-response-cell-repair-pair-1a5f`                                                                                                                |
| **Base `main` SHA** | `712c545d97d65b5f7fe606afcbdc48a97ec277c4`                                                                                                                                  |

## Goal

Map department task `containment_response` onto specialist task `containment_cell_repair` in the workshop week-close specialist labor feed — one additional explicit pair beside `records_review` → `archive_classification`. Keep personnel materialization on the one-slot archive_analyst list; use a separate two-slot campaign roster for absent/malformed saves so both gated tasks stay operable.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relevant files    | `specialistLaborOperatorFeed.ts`; `advanceWeek.ts` workshop comment; feed contract / advanceWeek / persist tests; SPE-3116 Deferred                                                              |
| Current behavior  | Projector emits only `records_review` → `archive_classification`; absent/malformed slots resolve to one-slot `PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS`                                        |
| Expected behavior | Present operator list also keys `containment_response` → `containment_cell_repair`; campaign resolve uses two-slot roster; personnel helpers still return one archive_analyst slot only          |
| Boundary          | One additional pair + campaign roster split + contract tests + slice/backlog. No SPE-3114 clear. No further pairs. No SCHEMA_REGISTRY change                                                     |
| Risks             | Widening personnel writes to emit containment_engineer; writing `[]` on absent field; closing SPE-1052 / SPE-3114; second week-close path                                                         |
| Validation        | `specialistLaborOperatorFeed.contract.test.ts`, advanceWeek feed wire, persist resolve, agent/staff map one-slot return, lint, `npm run verify:backlog-handoff`                                   |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; SPE-3116 Deferred pair row retarget                                                                              |

## Boundary

### In scope

- Extend `projectSpecialistLaborGateInputsByWorkOrderId` for `containment_response` → `containment_cell_repair`
- Keep `PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS` as one `archive_analyst` / `competent` / `fit` list for personnel helpers
- Add `CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS` (archive_analyst + containment_engineer) used only by `resolveCampaignSpecialistLaborOperatorSlots`
- Present saved list including `[]` still replaces the campaign roster (SPE-3113)
- Targeted Vitest + backlog handoff + slice doc
- Retarget SPE-3116 deferred “further pairs” row to this child for this one pair only

### Out of scope

- Clearing materialized slots when mapped personnel leave (SPE-3114)
- Stat-to-band, automation, succession, priority-conflict, clearance
- Any further department-task pair
- Teaching personnel helpers to emit a containment engineer
- New persisted field / SCHEMA_REGISTRY change
- Closing SPE-1052 or SPE-3114; reopening SPE-3116 / SPE-3115 / SPE-3113 / SPE-3112 / SPE-3110 / SPE-3109 / SPE-1058

## Seam

`resolveCampaignSpecialistLaborOperatorSlots` returns `CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS` when the field is absent or malformed so both gated pairs stay operable. A present list (including `[]`) replaces that roster. Personnel helpers still return `PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS` only, so a materialized archive_analyst-only list stalls `containment_response` while `records_review` stays operable. The projector copies the same operator list onto each keyed work order; SPE-1058 decides operable vs stall.

## Acceptance

- [x] Absent field and no mapped personnel: both `records_review` and `containment_response` stay operable on the two-slot campaign roster; field is not written as `[]`
- [x] Present `[]` stalls both gated tasks
- [x] A saved or personnel-written archive_analyst-only list is not overwritten and stalls `containment_response` while `records_review` stays operable
- [x] A non-paired sibling (e.g. `research_case`) still completes
- [x] Parent SPE-1052 remains **Backlog**; SPE-3114 remains **Backlog**; SPE-3116 / SPE-3115 / SPE-3113 / SPE-3112 / SPE-3110 / SPE-3109 / SPE-1058 stay Done

## Deferred

| Item or mechanic                                                         | Owner or prerequisite                                                                 | Why deferred                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Clear materialized slots when the mapped staff/agent leaves the roster   | SPE-3114 authority disposition; later SPE-1052 child                                  | Absent-field-only write; no weekly overwrite or clear                        |
| Stat-to-band formula (skill / availability from staff efficiency)        | later SPE-1052 child or SPE-1059 / SPE-1058 consumer                                  | Fixed competent/fit bands only                                               |
| Further department-task → specialist-task pairs beyond the two live pairs | later SPE-1052 child                                                                  | This child adds only `containment_response` → `containment_cell_repair`      |
| Automation / succession / priority-conflict / clearance                  | later SPE-1058 child or SPE-1052 child                                                | Out of this mapping boundary                                                 |

Parent SPE-1052 remains **Backlog**. Do not treat GitHub linkback alone as umbrella completion. Do not close SPE-3114 from this child.

## Validation

- Targeted Vitest: `src/test/specialistLaborOperatorFeed.contract.test.ts`, `src/test/specialistLaborOperatorFeed.advanceWeek.test.ts`, `src/test/specialistLaborOperatorSlots.persist.contract.test.ts`
- Related: `src/test/specialistLaborAgentRoleMap.contract.test.ts`, `src/test/specialistLaborStaffRoleMap.contract.test.ts`
- Regression fixtures that need operable `containment_response` under starter-roster investigators: `src/test/helpers/withoutMappedArchiveAnalystPersonnel.ts` (used by workshop persistence / layout / staging / live-integrity suites)
- ESLint on touched files
- `npm run verify:backlog-handoff`
