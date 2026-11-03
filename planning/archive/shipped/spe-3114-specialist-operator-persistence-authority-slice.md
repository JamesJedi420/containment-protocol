# SPE-3114 — Contradiction check: specialist operator persistence versus canonical personnel competency state

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                             |
| **Linear**          | [SPE-3114](https://linear.app/spectranoir/issue/SPE-3114/contradiction-check-specialist-operator-persistence-versus-canonical)                                               |
| **Parent**          | none (related to [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**)                          |
| **Related**         | SPE-3113 persist slots (Done — retain as cache); SPE-3117 / SPE-3116 / SPE-3115 feed maps (Done); SPE-3118 clear-on-leave child (Backlog); SPE-1058 / SPE-1059 / SPE-2266  |
| **Branch**          | `cursor/spe-3114-specialist-operator-persistence-authority-6827`                                                                                                            |
| **Base `main` SHA** | `1cbec91b814aca965181017fa02cbf023c318929`                                                                                                                                  |

## Goal

Resolve the authoritative-state boundary for specialist labor so persisted `SpecialistOperatorSlot` records cannot become a competing personnel/competency source of truth. Planning/reconciliation only — no gameplay runtime in this slice.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relevant files    | `specialistLaborOperatorFeed.ts`; `advanceWeek` workshop block; SPE-3113 / SPE-3117 / SPE-3115 / SPE-3116 slice docs; SPE-1058 / SPE-1059 / SPE-2266                                           |
| Current behavior  | Present `specialistOperatorSlots` (incl. personnel-written archive-analyst-only) is never overwritten; absent/malformed → campaign roster; no clear when mapped personnel leave                   |
| Expected behavior | Explicit authority map + slot classification + SPE-3113 disposition + fixture bound + routed SPE-3118 clear-on-leave child                                                                       |
| Boundary          | Docs + Linear dispositions + backlog handoff + SPE-3118 child create. No domain runtime. Do not reopen Done children. Do not close SPE-1052                                                       |
| Risks             | Treating campaign fixtures as personnel; reopening SPE-3113; implementing clear-on-leave here; closing SPE-1052                                                                                    |
| Validation        | `npm run verify:backlog-handoff`                                                                                                                                                                 |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; SPE-3117 Deferred clear-on-leave retarget                                                                        |

## Binding dispositions

### 1. Authority map

| Concern | Owner |
| --- | --- |
| Personnel identity / roster lifecycle | `GameState.agents` / `GameState.staff` |
| Competency / skill progression | SPE-1059 / SPE-2266 (Backlog; not yet consumed by the workshop feed) |
| Task gate outcomes | SPE-1058 (Done) over **caller-owned** slots only |
| Workshop feed mapping writers | SPE-3115 / SPE-3116 helpers in `src/domain/specialistLaborOperatorFeed.ts` |

### 2. `SpecialistOperatorSlot` classification

Persisted **materialized projection/cache** for the workshop week-close feed — not authoritative personnel, availability, competency, clearance, fit, or assignment state.

### 3. Persistence / hydration / replay

- Absent/malformed → `CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS` (bootstrap/fallback only)
- Present list including `[]` replaces campaign roster; never rewritten by personnel maps
- Personnel maps write only when the field is still absent; never write `[]` for “no match”
- **Gap (routed):** no weekly rederive/clear when mapped investigator / `analysis` staff leave while a list is already present → [SPE-3118](https://linear.app/spectranoir/issue/SPE-3118/clear-or-rederive-specialistoperatorslots-when-mapped-personnel-leave)

### 4. Fixture bound

`PRODUCTION_SPECIALIST_LABOR_OPERATOR_SLOTS` and `CAMPAIGN_SPECIALIST_LABOR_OPERATOR_SLOTS` are campaign bootstrap + materialization shapes, **not** canonical campaign personnel.

### 5. SPE-1058 vs SPE-1059

SPE-1058 stays **Done** as gate consumer of caller-owned slots. Competency-profile consumption remains SPE-1059 / SPE-2266 future work. Do not reopen SPE-1058.

### 6. SPE-3113 disposition

**Retain with derived-state / materialized-cache semantics.** Do not reopen SPE-3113. Stale-slot remediation is prospective (SPE-3118).

### 7. Routed implementation owner

[SPE-3118](https://linear.app/spectranoir/issue/SPE-3118/clear-or-rederive-specialistoperatorslots-when-mapped-personnel-leave) — Clear or rederive `specialistOperatorSlots` when mapped personnel leave. Week-close only. Parent SPE-1052 stays **Backlog**.

## Boundary

### In scope

- Linear dispositions for the seven decisions above
- This slice doc + backlog handoff
- Create SPE-3118; retarget SPE-3117 Deferred clear-on-leave row to SPE-3118

### Out of scope

- Runtime clear/rederive (SPE-3118)
- Further department-task pairs, stat-to-band, automation/succession
- Reopening SPE-3117 / SPE-3116 / SPE-3115 / SPE-3113 / SPE-3112 / SPE-3110 / SPE-3109 / SPE-1058
- Closing SPE-1052 or implementing SPE-2266 competency consume

## Acceptance

- [x] Authority map explicit
- [x] `SpecialistOperatorSlot` classified as materialized projection/cache
- [x] Persistence/hydration/replay semantics affirmed; stale-slot gap routed to SPE-3118
- [x] Fixture semantics bounded (bootstrap/fallback, not personnel)
- [x] SPE-1058 stays Done; SPE-1059/SPE-2266 remain competency owners
- [x] SPE-3113 disposition: retain with derived-state / materialized-cache semantics
- [x] SPE-3118 created as SPE-1052 child; SPE-1052 remains **Backlog**

## Deferred

| Item or mechanic                                                         | Owner or prerequisite                                                                 | Why deferred                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Clear/rederive slots when mapped personnel leave                         | [SPE-3118](https://linear.app/spectranoir/issue/SPE-3118/clear-or-rederive-specialistoperatorslots-when-mapped-personnel-leave) | Runtime; SPE-3114 does not wait for that child                               |
| Competency-profile consume into specialist bands                         | SPE-1059 / SPE-2266                                                                   | Fixed competent/fit bands only today                                        |
| Further department-task → specialist-task pairs                          | later SPE-1052 child                                                                  | Outside authority check                                                      |

## Validation

- `npm run verify:backlog-handoff`
- No domain runtime change expected
