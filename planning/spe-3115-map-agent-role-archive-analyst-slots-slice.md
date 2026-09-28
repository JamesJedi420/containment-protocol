# SPE-3115 — Map one authored agent role onto archive_analyst specialist slots

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-3115](https://linear.app/spectranoir/issue/SPE-3115/map-one-authored-agent-role-onto-archive-analyst-specialist-slots)                                                 |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-3113 persist slots (Done — do not reopen); SPE-3112 live feed (Done); SPE-3110 week-close wire (Done); SPE-3109 adapter (Done); SPE-1058 registry (Done)               |
| **Branch**          | `cursor/spe-3115-map-agent-archive-analyst-slots-dc5f`                                                                                                                      |
| **Base `main` SHA** | `12590a4d76c9a7702bc03db08a4e996cdda227f8`                                                                                                                                  |

## Goal

Map one authored `AgentRole` (`investigator`) onto a single `archive_analyst` specialist slot. Write `GameState.specialistOperatorSlots` only when a matching agent is present and the field is still absent. Unmapped roles and an empty roster leave the field absent so week-close keeps the SPE-3112 production fixture. Never write `[]` for “no match.”

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relevant files    | `specialistLaborOperatorFeed.ts`; `advanceWeek.ts` workshop block; `models.ts`; SPE-3113 Deferred                                                                                                |
| Current behavior  | Optional saved slots replace the fixture; no agent-role bridge; starter investigator does not materialize slots                                                                                  |
| Expected behavior | Absent field + investigator → one `archive_analyst` / `competent` / `fit` slot written and fed into the projector same week; present field (incl. `[]`) never overwritten; no match → leave absent |
| Boundary          | One explicit role map + week-close consume + contract tests + slice/backlog. No staff map. No stat-to-band. No second task pair. No SCHEMA_REGISTRY change                                       |
| Risks             | Identity-mapping the unions; treating “no match” as `[]`; deriving bands from stats; mapping staff; closing SPE-1052                                                                            |
| Validation        | `src/test/specialistLaborAgentRoleMap.contract.test.ts`, related persist/feed tests, lint, `npm run verify:backlog-handoff`                                                                     |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; SPE-3113 Deferred owner retarget                                                                                |

## Boundary

### In scope

- One explicit binding: `investigator` → `archive_analyst` with fixed `competent` / `fit` bands (reuse `PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS`)
- `deriveArchiveAnalystSlotsFromMappedAgents` in `specialistLaborOperatorFeed.ts`
- `advanceWeek` workshop block: when derived, feed the projector and set `outputWeeklyState.specialistOperatorSlots`
- Targeted Vitest + backlog handoff + slice doc
- Retarget SPE-3113 deferred agent-mapping row to this child; staff mapping stays deferred

### Out of scope

- Staff → specialist role-family mapping
- Stat-to-band formula
- Further department-task → specialist-task pairs beyond `records_review`
- Changes to SPE-3113 fail-close / empty-list stall semantics
- Changes to SPE-1058 / SPE-3109 / SPE-3110 / SPE-3112 gate or mapping semantics
- Automation / succession / priority-conflict / clearance
- Clearing a materialized slot after the investigator leaves (SPE-3114 authority)
- Closing SPE-1052; reopening SPE-3113, SPE-3112, SPE-3110, SPE-3109, or SPE-1058

## Seam

`deriveArchiveAnalystSlotsFromMappedAgents(agents, specialistOperatorSlots)` returns the production fixture list only when the field is `undefined` and at least one agent has `role === 'investigator'`. Otherwise it returns `undefined` and the caller leaves the field untouched. Campaign week-close uses the derived list for the projector when present; otherwise it keeps SPE-3113 `resolveCampaignSpecialistLaborOperatorSlots`. A present empty list still stalls `records_review`.

## Acceptance

- [x] Roster with no matching agent and an absent field: field stays absent, `records_review` stays operable on the production fixture; field is not `[]`
- [x] One mapped agent writes exactly one `archive_analyst` / `competent` / `fit` slot and week-close consumes it
- [x] Unmapped roles do not persist `[]`
- [x] Saved `[]` and saved novice slots are not overwritten when an investigator is also present
- [x] A non-`records_review` sibling still completes
- [x] Parent SPE-1052 remains **Backlog**; SPE-3113 / SPE-3112 / SPE-3110 / SPE-3109 / SPE-1058 stay Done

## Deferred

| Item or mechanic                                                         | Owner or prerequisite                                                                 | Why deferred                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Staff → specialist role-family mapping                                   | [SPE-3116](https://linear.app/spectranoir/issue/SPE-3116/map-one-authored-staff-role-onto-archive-analyst-specialist-slots) | Owned by SPE-3116 staff specialty → archive_analyst child |
| Clear materialized slots when the mapped agent leaves the roster         | SPE-3114 authority disposition; later SPE-1052 child                                  | Absent-field-only write; no weekly overwrite or clear                        |
| Stat-to-band formula (skill / availability from agent stats)             | later SPE-1052 child or SPE-1059 / SPE-1058 consumer                                  | Fixed competent/fit bands only                                               |
| Further department-task → specialist-task pairs beyond `records_review` | later SPE-1052 child                                                                  | One explicit pair remains the live feed                                      |
| Automation / succession / priority-conflict / clearance                  | later SPE-1058 child or SPE-1052 child                                                | Out of this mapping boundary                                                 |

Parent SPE-1052 remains **Backlog**. Do not treat GitHub linkback alone as umbrella completion.

## Validation

- Targeted Vitest: `src/test/specialistLaborAgentRoleMap.contract.test.ts`
- Related: `src/test/specialistLaborOperatorSlots.persist.contract.test.ts`, `src/test/specialistLaborOperatorFeed.contract.test.ts`, `src/test/specialistLaborOperatorFeed.advanceWeek.test.ts`
- ESLint on touched files
- `npm run verify:backlog-handoff`
