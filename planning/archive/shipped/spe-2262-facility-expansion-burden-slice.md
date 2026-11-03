# SPE-2262 — Facility expansion burden and institutional overhead (slice 1)

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-2262](https://linear.app/spectranoir/issue/SPE-2262/facility-expansion-burden-and-institutional-overhead-slice-1)                                                      |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-1026 layout kernel (do not retune); SPE-1058 labor consume (later); SPE-2261 collapse consume (later)                                                                   |
| **Branch**          | `cursor/spe-2262-facility-expansion-burden-6a85`                                                                                                                            |
| **Base `main` SHA** | `f3b43adfb5a245afed92881cd0ad2acba8a5992f`                                                                                                                                  |

## Goal

Add a pure deterministic facility expansion burden projector so new rooms increase named capability while also increasing travel time, upkeep, staffing minimums, patrol coverage gap risk, and maintenance debt accrual.

## Pre-coding summary

| Item              | Finding                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | No prior `facilityExpansionBurden` module; SPE-1026 `facilityLayoutStrategy.ts` owns archetype travel/capacity metrics only               |
| Current behavior  | Expansion burden ACs unmet; layout kernel does not project room-count bands into institutional overhead                                   |
| Expected behavior | Caller-owned room count → band + burden metrics + named capability grant; fail-closed on malformed inputs                                 |
| Boundary          | Pure evaluate module + contract tests + slice doc + backlog handoff. No GameState, week-close, UI, pathfinding, or labor/collapse consume |
| Risks             | Duplicating SPE-1026 adjacency; inventing pathfinding; closing SPE-1052 early; wiring SPE-1605 kinds (SPE-3043 STOP stays intact)         |
| Validation        | `src/test/facilityExpansionBurden.contract.test.ts`, lint, `npm run verify:backlog-handoff`                                               |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                              |

## Boundary

### In scope

- `ExpansionBurdenRecord` in `src/domain/facilityExpansionBurden.ts`
- Room-count bands: `baseline` (0–3), `expanded` (4–7), `sprawling` (8+)
- Outputs: travel-time multiplier, upkeep load, staffing minimum, patrol coverage gap risk, maintenance debt accrual
- Named capability grants: `core_footprint` / `annex_capacity` / `wing_capacity`
- `projectFacilityExpansionBurden` + `compareFacilityExpansionBurden`
- Targeted Vitest contract coverage

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- Week-close hooks, planner UI, pathfinding
- Retuning SPE-1026 archetype metrics or layout adjacency
- SPE-1058 labor consume of staffing minimums
- SPE-2261 collapse consume of maintenance debt
- SPE-71 / SPE-1610 / SPE-1667 enabler work
- Any SPE-1605 store wire (SPE-3043 ownership STOP remains intact)
- Parent SPE-1052 closure

## Seam

Callers pass `{ roomCount, priorRoomCount? }`. `projectFacilityExpansionBurden` maps the integer count onto an authored band table and returns an immutable record. Higher bands strictly increase every burden metric and upgrade the capability id. Malformed counts (non-integer, negative, non-finite) and malformed optional `priorRoomCount` fail closed to `undefined`.

## Acceptance

- [x] Expanding room count raises at least one burden metric while granting a named capability
- [x] Validation example shows expansion tradeoff (capability up, burden up) via `compareFacilityExpansionBurden`
- [x] Tests cover deterministic band edges and fail-closed malformed input
- [x] No GameState field; parent SPE-1052 remains **Backlog**

## Deferred

| Item or mechanic                                        | Owner or prerequisite                                                                                                                                                   | Why deferred                                                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Labor consume of staffing mins / upkeep                 | [SPE-1058](https://linear.app/spectranoir/issue/SPE-1058/specialist-labor-task-gating-and-skill-dependent-production-system)                                            | Slice 1 projection only                                                                                          |
| Collapse consume of maintenance debt at week-close      | [SPE-2261](https://linear.app/spectranoir/issue/SPE-2261/internal-institutional-collapse-pathways-slice-1) registry shipped; week-close / GameState wire still deferred | SPE-2261 slice 1 owns pure pathway projection only; callers still pass maintenance debt; no auto week-close wire |
| SPE-71 touch/open trigger surface → later SPE-1605 wire | [SPE-71](https://linear.app/spectranoir/issue/SPE-71/preplaced-site-trigger-families-kernel) then SPE-1605 child                                                        | SPE-3043 STOP; not this facility slice                                                                           |
| Planner UI / week-close auto-apply                      | later UI / SPE-1058 adjacency                                                                                                                                           | Domain projector only                                                                                            |
| Eighth room-to-department staging pair                  | catalog stop on SPE-1052                                                                                                                                                | Unrelated; catalog remains stopped                                                                               |

Parent SPE-1052 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/facilityExpansionBurden.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`

## SPE-3119 integration follow-up

The live maintenance wire is owned by [SPE-3119](https://linear.app/spectranoir/issue/SPE-3119), documented in `planning/spe-3119-expansion-collapse-week-close-slice.md`. It consumes these unchanged pure contracts, persists accumulated debt, and routes collapse through existing workshop dependency gates. The original slice remains shipped; facility repair and broader burden conversions remain deferred.
