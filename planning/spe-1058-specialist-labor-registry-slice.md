# SPE-1058 — Specialist labor / task-gate registry (slice 1)

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-1058](https://linear.app/spectranoir/issue/SPE-1058/specialist-labor-task-gating-and-skill-dependent-production-system)                                                |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-2261 collapse pathway outputs (caller-owned only); SPE-2262 staffing mins (do not consume); SPE-1028 workshop queues (read-only); SPE-1051 scars (out of scope)         |
| **Branch**          | `cursor/spe-1058-specialist-labor-registry-fca2`                                                                                                                            |
| **Base `main` SHA** | `7f03576f6e111222a77a051e13001a5b66407326`                                                                                                                                  |

## Goal

Add a pure deterministic specialist-labor registry so authored role families, availability/condition bands, and skill bands can gate production and containment tasks when the qualified operator is missing or unfit — without assuming infrastructure alone implies capability.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | No prior `specialistLaborRegistry` module; SPE-2261 / SPE-2262 pure validate/project patterns; workshop `specialistCondition` is a separate queue quality input (do not wire) |
| Current behavior  | Specialist labor ACs unmet; no role-family task-gate projector                                                                                                                |
| Expected behavior | Caller-owned task id + operator slots → exact-role gate outcome + skill/availability-scaled output quality; adjacent expertise fails closed                                   |
| Boundary          | Pure registry + validate/project + contract tests + slice doc + backlog handoff. No GameState, week-close, workshop consume, automation, or per-person sim                    |
| Risks             | Closing SPE-1052 early; treating adjacent expertise as correct specialty; inventing per-person sim; wiring collapse/burden/workshop week-close; silent mutation               |
| Validation        | `src/test/specialistLaborRegistry.contract.test.ts`, lint, `npm run verify:backlog-handoff`                                                                                   |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                                                                  |

## Boundary

### In scope

- `SpecialistRoleFamily`, availability bands, skill bands, and authored task ids in `src/domain/specialistLaborRegistry.ts`
- Exact-role task-gate projection (`operable` / `degraded` / `stalled`) with stall reasons
- Skill- and availability-scaled output quality (success rate, throughput, contamination, latent defects, material purity)
- Adjacent-expertise rejection (wrong role never satisfies the required specialty)
- `validateSpecialistLaborGateInput` + `projectSpecialistLaborGate`
- Targeted Vitest contract coverage

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- Week-close hooks, planner UI, workshop queue consume
- Full labor consume of SPE-2261 routing / SPE-2262 staffing outputs
- Automation mitigation path
- Training / succession / cross-training capability growth
- Priority-conflict arbitration between competing tasks
- Clearance / psychological-fit permission gates beyond availability bands
- Per-person simulation or staff identity records
- SPE-2261 / SPE-2262 semantic changes
- SPE-1051 campaign scars
- SPE-1026 layout, SPE-3043 STOP, SPE-71 / SPE-1610 / SPE-1667, activator/calendar, SPE-1605 wires
- Parent SPE-1052 closure

## Seam

Callers pass `{ taskId, operators, infrastructurePresent? }`. `projectSpecialistLaborGate` looks up the authored required role for the task, selects the best exact-role operator that is not `unavailable` (healthier availability, then higher skill, then earlier index), and returns an immutable gate projection. Adjacent roles never satisfy the gate. Infrastructure alone never unlocks the task. Malformed inputs fail closed to `undefined`.

## Acceptance (slice 1)

- [x] At least one production/containment task stalls or degrades when the correct specialist is missing or only adjacent expertise is present
- [x] At least one operator skill difference changes output quality or contamination risk materially
- [x] Tests cover deterministic task gating, skill-quality effects, fail-closed malformed input, and byte-stable projection
- [x] No GameState field; parent SPE-1052 remains **Backlog**

## Deferred

| Item or mechanic                                                         | Owner or prerequisite                                                                                                        | Why deferred                                                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Full workshop / labor consume of gate projections into SPE-1028 queues   | [SPE-3109](https://linear.app/spectranoir/issue/SPE-3109/pure-workshop-consume-adapter-over-specialist-labor-gate) (SPE-1052 child; pure adapter) | Slice 1 owns pure role/availability/skill gate projection only; consume adapter is SPE-3109 |
| Week-close / GameState persistence of specialist roster or gate outcomes | later SPE-1052 child                                                                                                         | No GameState field in this slice                                                      |
| Automation mitigation path (reduces labor dependency + new failure mode) | later SPE-1058 child                                                                                                         | Full Linear AC remains; out of slice-1 registry boundary                              |
| Training / succession / cross-training long-term capability change       | later SPE-1058 child; progression authority remains SPE-1059 / SPE-14                                                        | Slice 1 projects current skill bands only; does not grow or lose capability over time |
| Priority-conflict arbitration between competing specialist tasks         | later SPE-1058 child                                                                                                         | Slice 1 gates one task at a time; no multi-task contention                            |
| Clearance / psychological-fit / trainee permission gates                 | later SPE-1058 child; clearance owners SPE-1046 / SPE-2078                                                                   | Availability bands cover fit/fatigue/impaired/unavailable only                        |
| SPE-2261 routing / SPE-2262 staffing consume at week-close               | SPE-2261 / SPE-2262 registries shipped; week-close wire still deferred                                                       | Do not change SPE-2261 or SPE-2262 semantics; callers still own inputs                |
| SPE-1051 campaign scars                                                  | [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051/recoverable-failure-campaign-scars-and-after-action-collapse-model) | Keep scars out of this labor slice                                                    |

Parent SPE-1052 remains **Backlog**. Remaining full-issue Linear acceptance items stay deferred as child work — do not treat GitHub linkback alone as umbrella completion.

## Validation

- Targeted Vitest: `src/test/specialistLaborRegistry.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
