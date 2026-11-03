# SPE-3116 — Map one authored staff role onto archive_analyst specialist slots

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                             |
| **Linear**          | [SPE-3116](https://linear.app/spectranoir/issue/SPE-3116/map-one-authored-staff-role-onto-archive-analyst-specialist-slots)                                                 |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-3115 agent map (Done — compose, do not reopen); SPE-3114 contradiction check (Backlog — do not close); SPE-3113 persist slots (Done); SPE-3112 live feed (Done)       |
| **Branch**          | `cursor/spe-3116-map-staff-archive-analyst-slots-49c6`                                                                                                                      |
| **Base `main` SHA** | `bddcf4233b645c931ea245c45ce49c0af09e55b2`                                                                                                                                  |

## Goal

Map one authored staff specialty (`analysis`) onto a single `archive_analyst` specialist slot. Write `GameState.specialistOperatorSlots` only when a matching staff member is present and the field is still absent. Compose with SPE-3115 agent map in **agent-then-staff** order. Unmapped specialties and an empty staff roster leave the field absent so week-close keeps the SPE-3112 production fixture or an already-materialized agent slot. Never write `[]` for “no match.”

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relevant files    | `specialistLaborOperatorFeed.ts`; `advanceWeek.ts` workshop block; `models.ts` staff + slots; SPE-3115 Deferred                                                                                  |
| Current behavior  | SPE-3115 materializes slots from `investigator` agents only; staff specialty has no bridge                                                                                                       |
| Expected behavior | Absent field + `analysis` staff (and no investigator) → one `archive_analyst` / `competent` / `fit` slot written and fed into the projector same week; present field never overwritten           |
| Boundary          | One explicit staff specialty map + agent-then-staff compose + week-close consume + contract tests + slice/backlog. No second task pair. No stat-to-band. No SPE-3114 / SPE-1052 closure          |
| Risks             | Writing `[]` on no match; overwriting agent-derived / saved novice / `[]`; inventing staff roles; closing SPE-3114 or SPE-1052                                                                    |
| Validation        | `src/test/specialistLaborStaffRoleMap.contract.test.ts`, agent map / persist / feed tests, lint, `npm run verify:backlog-handoff`                                                                |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; SPE-3115 Deferred staff row retarget                                                                             |

## Boundary

### In scope

- One explicit binding: staff specialty `analysis` → `archive_analyst` with fixed `competent` / `fit` bands (reuse `PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS`)
- `deriveArchiveAnalystSlotsFromMappedStaff` + `deriveArchiveAnalystSlotsFromMappedPersonnel` (agent-then-staff) in `specialistLaborOperatorFeed.ts`
- `advanceWeek` workshop block: compose personnel derivation; when derived, feed the projector and set `outputWeeklyState.specialistOperatorSlots`
- Targeted Vitest + backlog handoff + slice doc
- Retarget SPE-3115 deferred staff-mapping row to this child; mark SPE-3115 Recently shipped in backlog handoff

### Out of scope

- Stat-to-band formula
- Further department-task → specialist-task pairs beyond `records_review`
- Changes to SPE-3115 agent binding or absent-field rule
- Changes to SPE-3113 fail-close / empty-list stall semantics
- Changes to SPE-1058 / SPE-3109 / SPE-3110 / SPE-3112 gate or mapping semantics
- Automation / succession / priority-conflict / clearance
- Clearing a materialized slot after the mapped staff/agent leaves (SPE-3114 authority)
- Closing SPE-1052 or SPE-3114; reopening SPE-3115, SPE-3113, SPE-3112, SPE-3110, SPE-3109, or SPE-1058

## Seam

`deriveArchiveAnalystSlotsFromMappedPersonnel(agents, staff, specialistOperatorSlots)` tries SPE-3115 agent map first, then SPE-3116 staff map. Either returns the production fixture list only when the field is `undefined` and a match is present. Otherwise it returns `undefined` and the caller leaves the field untouched. Campaign week-close uses the derived list for the projector when present; otherwise it keeps SPE-3113 `resolveCampaignSpecialistLaborOperatorSlots`. A present empty list still stalls `records_review`.

## Acceptance

- [x] Roster with no matching staff and no investigator and an absent field: field stays absent, `records_review` stays operable on the production fixture; field is not `[]`
- [x] One mapped `analysis` staff writes exactly one `archive_analyst` / `competent` / `fit` slot when the field is absent and week-close consumes it
- [x] Present `[]` / novice / agent-derived slots are not overwritten when matching staff is also present
- [x] A non-`records_review` sibling still completes
- [x] Parent SPE-1052 remains **Backlog**; SPE-3114 remains **Backlog**; SPE-3115 / SPE-3113 / SPE-3112 / SPE-3110 / SPE-3109 / SPE-1058 stay Done

## Deferred

| Item or mechanic                                                         | Owner or prerequisite                                                                 | Why deferred                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Clear materialized slots when the mapped staff/agent leaves the roster   | SPE-3114 authority disposition; later SPE-1052 child                                  | Absent-field-only write; no weekly overwrite or clear                        |
| Stat-to-band formula (skill / availability from staff efficiency)        | later SPE-1052 child or SPE-1059 / SPE-1058 consumer                                  | Fixed competent/fit bands only                                               |
| Further department-task → specialist-task pairs beyond `records_review` | [SPE-3117](https://linear.app/spectranoir/issue/SPE-3117/map-containment-response-onto-containment-cell-repair-in-the-workshop) for `containment_response` → `containment_cell_repair` only; remaining pairs stay deferred on that slice | One additional pair owned by SPE-3117; do not reopen this child |
| Automation / succession / priority-conflict / clearance                  | later SPE-1058 child or SPE-1052 child                                                | Out of this mapping boundary                                                 |

Parent SPE-1052 remains **Backlog**. Do not treat GitHub linkback alone as umbrella completion. Do not close SPE-3114 from this child.

## Validation

- Targeted Vitest: `src/test/specialistLaborStaffRoleMap.contract.test.ts`
- Related: `src/test/specialistLaborAgentRoleMap.contract.test.ts`, `src/test/specialistLaborOperatorSlots.persist.contract.test.ts`, `src/test/specialistLaborOperatorFeed.contract.test.ts`, `src/test/specialistLaborOperatorFeed.advanceWeek.test.ts`
- ESLint on touched files
- `npm run verify:backlog-handoff`
