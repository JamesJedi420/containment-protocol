# SPE-2986 — Persist facility layout graph on GameState

| Field               | Value                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                          |
| **Linear**          | [SPE-2986](https://linear.app/spectranoir/issue/SPE-2986/persist-facility-layout-graph-on-gamestate)                                          |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**             |
| **Predecessor**     | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model) — already **Done**; do not reopen |
| **Related**         | SPE-2889 staging persist (unchanged); SPE-1027 stock helpers (unchanged)                                                                      |
| **Branch**          | `cursor/spe-2986-layout-persist-gamestate-1ffc`                                                                                               |
| **Base `main` SHA** | `d879c9343e6a31ac2e9e6450e7cf6d7e80926a26`                                                                                                    |

## Goal

Persist an optional authored facility layout snapshot on `GameState` and hydrate it
fail-closed so the SPE-1026 kernel can be resolved from saved inputs.

## Pre-coding summary

| Item              | Finding                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/facilityLayoutStrategy.ts`; `departmentLocalStaging` parse/hydrate; `GameState` / `hydrateGame`; `SCHEMA_REGISTRY.md`; `GAME_STORE_VERSION`          |
| Current behavior  | Kernel is caller-owned. No layout field on `GameState`. SPE-1026 deferred row is "Persist facility layout graph on GameState".                                   |
| Expected behavior | Optional snapshot of archetype, zone adjacencies, and kernel space sets. Omit/malformed → absent. Valid authored ids round-trip. Resolve matches kernel helpers. |
| Boundary          | Parse/hydrate + version bump + contract tests. No CAD projection, UI, week-close hook, or kernel retune.                                                         |
| Risks             | Coercing malformed booleans to `false`, or guessing a replacement id for an unknown zone, would silent-overwrite authored intent.                                |
| Validation        | `src/test/facilityLayoutPersist.contract.test.ts`, existing kernel contract, lint, `verify:backlog-handoff`, full `npm run test:run`                             |
| Docs              | This slice doc; backlog handoff + manifest; `SCHEMA_REGISTRY.md`                                                                                                 |

## Boundary

### In scope

- Optional `GameState.facilityLayoutSnapshot`:
  - `archetype`
  - `zoneAdjacencies` (normalized by `normalizeZoneAdjacencies`)
  - morale spaces, oversight spaces, and room records (`roomId` + authored `adjacentToCritical`)
  - optional `containmentMode` so `resolveSecureContainmentTradeoff` runs on the same snapshot
- Fail-closed `parseFacilityLayoutSnapshot`: omit, non-record, or nothing valid after rejection → `undefined`
- Unknown ids rejected. Zone edges use own `fromZoneId` / `toZoneId` only. First valid room boolean wins. Non-boolean `adjacentToCritical` drops that room
- `resolveFacilityLayoutSnapshot` calls the existing kernel helpers without retuning formulas
- `SCHEMA_REGISTRY` entry. `GAME_STORE_VERSION` 6 → 7. Version ≥ 1 envelopes still hydrate inside `hydrateGame`
- Targeted contract tests listed below

### Out of scope

- SPE-2889 `departmentLocalStaging` semantics and room-graph → adjacent/remote projection
- SPE-1027 stock helpers and spare-part consume
- Planner UI / specialist gates
- SPE-1606 zone-crossing breach events
- SPE-1029 morale campaign
- Week-close hooks that read or write the snapshot
- Live CAD derivation
- Persisted route-kind lists (kernel `resolveRouteTraversal` stays caller-owned)
- Reopening SPE-1026, SPE-1027, SPE-2889, or SPE-2984

## Acceptance

- [x] Hydrate omit → absent baseline, and does not inherit a fallback snapshot
- [x] Hydrate malformed → absent baseline, no throw, no fallback takeover
- [x] Round-trip valid archetype, zone adjacencies, and space sets
- [x] Resolved metrics match `resolveLayoutArchetypeMetrics`, `normalizeZoneAdjacencies`, `resolveMoraleSpaceEffect`, `resolveOversightSpaceEffect`, `resolveSecureContainmentTradeoff`, and `resolveRoomAdjacencyOutput` for the same inputs
- [x] Week-close does not consume, clear, or rewrite the snapshot; spare-part qty stays put
- [x] Parent SPE-1052 remains Backlog

## Deferred

| Item or mechanic                                      | Owner or prerequisite                                                                                            | Why deferred                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Project room graph → SPE-2889 staging adjacent/remote | later SPE-1052 child                                                                                             | SPE-2889 already persists caller-owned staging; this slice does not derive it |
| Facility planner UI / specialist gates                | later UI / SPE-1058 adjacency                                                                                    | Domain persist only                                                           |
| Focal-object room centers                             | later SPE-1052 / layout child                                                                                    | Not required to store authored ids                                            |
| Persisted route-kind list                             | later layout child                                                                                               | Kernel route metrics stay caller-owned; snapshot has no route field           |
| Zone-crossing breach event meaning                    | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                        | No event propagation this slice                                               |
| Staff housing campaign morale system                  | [SPE-1029](https://linear.app/spectranoir/issue/SPE-1029/staff-housing-recovery-and-morale-stabilization-system) | Layout-presence bump stays in the kernel                                      |

Parent SPE-1052 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/facilityLayoutPersist.contract.test.ts`
- Kernel regression: `src/test/facilityLayoutStrategy.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run test:run`
