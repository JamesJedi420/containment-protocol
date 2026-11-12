# SPE-1026 — Facility layout strategy and zone adjacency kernel

| Field               | Value                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                           |
| **Linear**          | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model)                                    |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**              |
| **Related**         | SPE-2889 staging persist (caller-owned adjacent/remote); SPE-1027 storage; SPE-2775 workshop adjacency; SPE-2262 expansion; SPE-1606 zone-span |
| **Branch**          | `cursor/spe-1026-layout-adjacency-kernel-d63b`                                                                                                 |
| **Base `main` SHA** | `3369889c12150a92a3446c8981d80238b713559e`                                                                                                     |

## Goal

Ship a bounded pure layout-strategy kernel so facility geometry encodes operating
doctrine through archetypes, zone adjacency, vertical routing, morale spaces, and
oversight spaces — not decorative map dressing.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | No prior `facilityLayoutStrategy` module; `facility.ts` is upgrade progression; SPE-2889 / SPE-2775 own caller-owned staging throughput, not CAD derivation; `mapAwareness.ts` is mission knowledge, not base doctrine |
| Current behavior  | Layout ACs unmet; topology-to-staging remains deferred from SPE-2889                                                                                                                                                   |
| Expected behavior | Deterministic archetype tradeoffs, room adjacency outputs, vertical route burdens, morale/oversight deltas, secure-layout inconvenience                                                                                |
| Boundary          | Pure caller-owned evaluate layer + targeted Vitest; no GameState persistence, UI, week-close, or live SPE-2889 projection                                                                                              |
| Risks             | Overbuilding a CAD sim; colliding with SPE-1027 storage zones or SPE-1029 morale systems                                                                                                                               |
| Validation        | `src/test/facilityLayoutStrategy.contract.test.ts`, lint, `verify:backlog-handoff`                                                                                                                                     |
| Docs              | This slice doc; backlog handoff + manifest; no SCHEMA bump (no persisted field)                                                                                                                                        |

## Boundary

### In scope

- Authored layout archetypes: `compact_headquarters`, `distributed_campus`,
  `hidden_annex`, `remote_safehouse` with configured secrecy / spread-resistance /
  travel / efficiency / capacity / upgrade-cost metrics
- Zone id catalog + deterministic adjacency normalization for planning/debug
- Room adjacency outputs (med bay vs containment cell critical peer)
- Vertical route kinds (elevator, stairwell, vent, shaft) vs flat corridor
- Morale-support and leadership/admin space effects (before/after same inputs)
- Secure/clean vs open/porous containment inconvenience tradeoff
- Targeted contract tests for ACs 1–8

### Out of scope

- `GameState` layout persistence / hydration / `GAME_STORE_VERSION`
- Live CAD → SPE-2889 staging adjacent/remote projection
- Player UI / facility planner surface
- Week-close hooks or production starting-state seed
- Full architectural CAD, specialist planner gates, focal-object room centers
- Recoding SPE-1027 storage, SPE-1029 staff housing/morale campaign systems,
  SPE-2262 expansion burden, or SPE-1606 zone-spanning events

## Seam

`src/domain/facilityLayoutStrategy.ts` is a pure evaluate module:

- `resolveLayoutArchetypeMetrics` / `compareLayoutArchetypes` — doctrine tradeoffs
- `resolveRoomAdjacencyOutput` — critical adjacency deltas
- `resolveRouteTraversal` — flat vs vertical traversal/breach-spread
- `resolveMoraleSpaceEffect` / `resolveOversightSpaceEffect` — space presence deltas
- `resolveSecureContainmentTradeoff` — secure inconvenience vs open layout
- `normalizeZoneAdjacencies` / `summarizeLayoutForDebug` — legible planning/debug map

Unknown / malformed inputs fail-close to `undefined` or baseline empty space sets.

## Acceptance

- [x] AC1: `hidden_annex` (and `remote_safehouse`) raise secrecy or spread-resistance vs `compact_headquarters` while increasing staff travel time / lowering staffing efficiency
- [x] AC2: `distributed_campus` raises capacity vs compact while increasing upgrade cost (and lowering secrecy)
- [x] AC3: `med_bay` adjacent to `containment_cell` improves response time / throughput / efficiency vs not adjacent
- [x] AC4: elevator/vent vertical routes differ in traversal cost or breach-spread vs `flat_corridor`
- [x] AC5: morale spaces raise retention/cohesion before→after same roster
- [x] AC6: oversight spaces raise oversight/audit-pressure before→after same facility space set
- [x] AC7: `secure_clean` raises secrecy while increasing travel time and lowering morale / logistics throughput vs `open_porous`
- [x] AC8: targeted tests cover adjacency, travel burden, vertical routing, morale, oversight, and secure tradeoffs

## Deferred

| Item or mechanic                                        | Owner or prerequisite                           | Why deferred                                                                  |
| ------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| Persist facility layout graph on `GameState`            | later SPE-1026 child or SPE-1052 topology child | Kernel is caller-owned this slice; no hydration yet                           |
| Project room graph → SPE-2889 staging adjacent/remote   | SPE-1026 / SPE-2889 follow-up                   | SPE-2889 already persists caller-owned staging; CAD derivation stays separate |
| Facility planner UI / specialist gates                  | later UI / SPE-1058 adjacency                   | Domain kernel only                                                            |
| Focal-object room centers                               | later SPE-1026 child                            | Reconciliation fold-in; not required by ACs                                   |
| Zone-crossing breach event meaning beyond route metrics | SPE-1606 / later                                | Vertical route cost/spread covers AC4 without event propagation               |
| Staff housing campaign morale system                    | SPE-1029                                        | This slice is layout-presence bump only                                       |

Parent SPE-1052 remains **Backlog**. SPE-1026 closes when this AC bar ships.

## Validation

- Targeted Vitest: `src/test/facilityLayoutStrategy.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
