# SPE-3113 — Persist specialist operator slots for the workshop week-close feed

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **In Progress**                                                                                                                                                             |
| **Linear**          | [SPE-3113](https://linear.app/spectranoir/issue/SPE-3113/persist-specialist-operator-slots-for-the-workshop-week-close-feed)                                                 |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-3112 live feed (Done — do not reopen); SPE-3110 week-close wire (Done); SPE-3109 adapter (Done); SPE-1058 registry (Done)                                               |
| **Branch**          | `cursor/spe-3113-persist-specialist-operator-slots-4ca4`                                                                                                                    |
| **Base `main` SHA** | `2b315a3095317819c7a1596c2c4e115ad7f10786`                                                                                                                                  |

## Goal

Persist an optional `GameState` list of `SpecialistOperatorSlot` so campaign week-close can replace the authored SPE-3112 production fixture when a valid saved roster exists. Absent or malformed saves keep the production fixture so campaign `records_review` stays operable; a present empty list still stalls `records_review`.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relevant files    | `specialistLaborOperatorFeed.ts`; `advanceWeek.ts` workshop block; `models.ts`; `runTransfer.ts` hydrate; `SCHEMA_REGISTRY.md`; SPE-3112 Deferred                                                 |
| Current behavior  | Campaign `advanceWeek` always passes `PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS`; no GameState roster                                                                                           |
| Expected behavior | Optional saved list replaces the fixture at the existing projector call; absent/malformed → fixture; present `[]` stalls `records_review`                                                        |
| Boundary          | One optional field + parse/hydrate + resolve at projector + contract tests + slice/backlog/SCHEMA docs. No agent/staff mapping. No new department-task pair                                     |
| Risks             | Treating absent as omit-the-map (ungates campaign); treating malformed as `[]` (stalls every order); inventing an agent-role bridge; closing SPE-1052                                           |
| Validation        | `src/test/specialistLaborOperatorSlots.persist.contract.test.ts`, related feed tests, lint, `npm run verify:backlog-handoff`                                                                   |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; `SCHEMA_REGISTRY.md`; SPE-3112 Deferred owner retarget                                                         |

## Boundary

### In scope

- Optional `GameState.specialistOperatorSlots?: readonly SpecialistOperatorSlot[]`
- `parseSpecialistOperatorSlots` / `resolveCampaignSpecialistLaborOperatorSlots` in `specialistLaborOperatorFeed.ts`
- Hydrate wire in `runTransfer.ts` (omit / malformed → absent; valid including `[]` kept)
- `advanceWeek` passes `resolveCampaignSpecialistLaborOperatorSlots(state.specialistOperatorSlots)` into the existing projector
- Targeted Vitest + backlog handoff + SCHEMA_REGISTRY entry

### Out of scope

- Agent or staff → specialist role-family mapping
- Further department-task → specialist-task pairs beyond `records_review`
- Changes to SPE-1058 / SPE-3109 / SPE-3110 / SPE-3112 gate or mapping semantics
- Automation / succession / priority-conflict / clearance
- Closing SPE-1052; reopening SPE-3112, SPE-3110, SPE-3109, or SPE-1058

## Seam

Hydration parses the optional list. A valid array (including empty) freezes own-key slot copies. A non-array or any malformed slot fail-closes the entire payload to absent — never to `[]`. Campaign week-close resolves absent/malformed to `PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS` and passes the result into `projectSpecialistLaborGateInputsByWorkOrderId`. Present empty still projects onto `records_review` and stalls.

## Acceptance

- [x] Absent field matches today's operable `records_review` receipt (production fixture)
- [x] A saved novice slot yields `poor_specialist_condition` through `advanceWeek`
- [x] A saved `[]` stalls only `records_review`
- [x] A malformed payload keeps the production fixture
- [x] A non-`records_review` sibling still completes
- [x] Parent SPE-1052 remains **Backlog**; SPE-3112 / SPE-3110 / SPE-3109 / SPE-1058 stay Done

## Deferred

| Item or mechanic                                                         | Owner or prerequisite                                                                 | Why deferred                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Agent or staff → specialist role-family mapping                         | later SPE-1052 child                                                                  | `AgentRole` does not match `SpecialistRoleFamily`; do not invent the bridge |
| Further department-task → specialist-task pairs beyond `records_review` | later SPE-1052 child                                                                  | One explicit pair remains the live feed                                      |
| Automation mitigation path (reduces labor dependency + new failure mode) | later SPE-1058 child or SPE-1052 child                                                | Full SPE-1058 AC remains; out of this persist boundary                       |
| Training / succession / cross-training long-term capability change       | later SPE-1058 child; progression authority remains SPE-1059 / SPE-14                 | Persist copies current slots; it does not grow or lose capability            |
| Priority-conflict arbitration between competing specialist tasks         | later SPE-1058 child or SPE-1052 child                                                | One slot list is copied onto every mapped work order                         |
| Clearance / psychological-fit / trainee permission gates                 | later SPE-1058 child; clearance owners SPE-1046 / SPE-2078                            | Availability bands already handled in SPE-1058 registry                      |

Parent SPE-1052 remains **Backlog**. Do not treat GitHub linkback alone as umbrella completion.

## Validation

- Targeted Vitest: `src/test/specialistLaborOperatorSlots.persist.contract.test.ts`
- Related: `src/test/specialistLaborOperatorFeed.contract.test.ts`, `src/test/specialistLaborOperatorFeed.advanceWeek.test.ts`
- ESLint on touched files
- `npm run verify:backlog-handoff`
