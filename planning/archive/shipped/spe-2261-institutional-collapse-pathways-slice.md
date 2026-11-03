# SPE-2261 — Internal institutional collapse pathways (slice 1)

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-2261](https://linear.app/spectranoir/issue/SPE-2261/internal-institutional-collapse-pathways-slice-1)                                                                  |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-2262 maintenance debt as optional caller input only; SPE-1051 scars (do not rewrite); SPE-1058 labor consume (do not implement)                                         |
| **Branch**          | `cursor/spe-2261-institutional-collapse-pathways-slice-1-b031`                                                                                                              |
| **Base `main` SHA** | `bb0d8c2a5ecc98b4faad728b15b0156b64d927eb`                                                                                                                                  |

## Goal

Add a pure deterministic internal-collapse pathway registry so hunger, stress, clutter, routing failure, labor misallocation, and maintenance debt can degrade facility function without external anomaly attack.

## Pre-coding summary

| Item              | Finding                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | No prior `institutionalCollapsePathways` module; SPE-2262 `facilityExpansionBurden.ts` owns maintenance debt accrual as caller-owned input only                |
| Current behavior  | Internal collapse ACs unmet; no pathway registry for non-combat institutional degrade/chain                                                                    |
| Expected behavior | Caller-owned pressure inputs → family pathways with threshold bands, degraded outputs, recovery requirements; critical maintenance chains into logistics stall |
| Boundary          | Pure registry + validate/project + contract tests + slice doc + backlog handoff. No GameState, week-close, SPE-1051 scar rewrite, or SPE-1058 labor implement  |
| Risks             | Over-absorbing SPE-1051 scars; inventing combat pathways; closing SPE-1052/SPE-1058 early; silent mutation; non-deterministic bands                            |
| Validation        | `src/test/institutionalCollapsePathways.contract.test.ts`, lint, `npm run verify:backlog-handoff`                                                              |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                                                   |

## Boundary

### In scope

- `InstitutionalCollapsePathwayId` + records in `src/domain/institutionalCollapsePathways.ts`
- Three pathway families: `supply_maintenance`, `labor_routing`, `morale_overload`
- Trigger inputs, threshold bands (`stable` / `strained` / `degraded` / `critical`), degraded outputs, recovery requirements
- Chain: `maintenance_debt_overrun` at critical activates `logistics_stall` at least at degraded
- `validateInstitutionalCollapsePathwayInput` + `projectInstitutionalCollapsePathways`
- Targeted Vitest contract coverage

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- Week-close hooks, planner UI, pathfinding
- SPE-2262 projector semantic changes
- SPE-1026 layout kernel changes
- SPE-1051 campaign scar rewrite
- SPE-1058 specialist labor consume / implement
- SPE-71 / SPE-1610 / SPE-1667 enabler work
- Any SPE-1605 store wire (SPE-3043 ownership STOP remains intact)
- Parent SPE-1052 closure
- Combat / anomaly attack pathways

## Seam

Callers pass optional non-negative finite trigger fields (`maintenanceDebt`, `supplyShortfall`, `routingFailureRate`, `laborMisallocation`, `moraleStress`, `clutterLoad`, `hungerPressure`). `projectInstitutionalCollapsePathways` maps present triggers onto authored pathway thresholds and returns an immutable projection of active pathways. Labor misallocation folds into routing; clutter/hunger fold into morale (max). Malformed inputs fail closed to `undefined`. Empty object yields an idle projection.

## Acceptance

- [x] At least one internal pathway fires from non-combat inputs (maintenance debt / routing / morale)
- [x] At least one pathway chains into a second degraded state (`maintenance_debt_overrun` critical → `logistics_stall` degraded)
- [x] Tests cover deterministic threshold crossing, chain, fail-closed malformed input, and byte-stable projection
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-1058 is **not** implemented

## Deferred

| Item or mechanic                                                                | Owner or prerequisite                                                                                                        | Why deferred                                                                                           |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Campaign-level recoverable failure / after-action scar rewrite                  | [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051/recoverable-failure-campaign-scars-and-after-action-collapse-model) | Slice 1 owns institutional pathway registry only; campaign scars stay on SPE-1051 — do not fold here   |
| Specialist labor consume of routing/labor misallocation outputs                 | [SPE-1058](https://linear.app/spectranoir/issue/SPE-1058/specialist-labor-task-gating-and-skill-dependent-production-system) | Pathway registry projects degrade bands only; labor gating/consume remains SPE-1058 — do not mark Done |
| Week-close / GameState wire of SPE-2262 maintenance debt into collapse triggers | later SPE-1052 child or explicit wire slice after SPE-2262 projector                                                         | SPE-2262 burden outputs stay caller-owned; this slice does not auto-apply at week-close                |

Parent SPE-1052 remains **Backlog**. SPE-1058 remains **Backlog** (not Done from this slice or any GitHub linkback).

## Validation

- Targeted Vitest: `src/test/institutionalCollapsePathways.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`

## SPE-3119 integration follow-up

The live maintenance wire is owned by [SPE-3119](https://linear.app/spectranoir/issue/SPE-3119), documented in `planning/spe-3119-expansion-collapse-week-close-slice.md`. It consumes these unchanged pure contracts, persists accumulated debt, and routes collapse through existing workshop dependency gates. The original slice remains shipped; facility repair and broader burden conversions remain deferred.
