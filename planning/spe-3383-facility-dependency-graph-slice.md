# SPE-3383 — Facility dependency-graph kernel

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                      |
| **Issue**         | [SPE-3383](https://linear.app/spectranoir/issue/SPE-3383)                 |
| **GitHub**        | [#4276](https://github.com/JamesJedi420/containment-protocol/issues/4276) |
| **Parent**        | [SPE-792](https://linear.app/spectranoir/issue/SPE-792) — Backlog         |
| **Umbrella**      | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog       |
| **Branch**        | `cursor/spe-3383-facility-dependency-graph`                               |
| **Base main SHA** | `9e96f47a762077d4fd3fce9d7d6cab6ceedbc3de`                                |

Status and backlog classification describe the merge handoff and take effect on merge. Keep Linear In Progress until review, CI, and merge are verified. Closing this child does not close SPE-792 or SPE-1052.

## Approved boundary

Pure caller-supplied functional dependency graph. Validate nodes and directed edges, then resolve `ready`, `degraded`, or `unavailable` with stable causes. No second spatial graph, lifecycle authority, persisted effective-capability ledger, workshop tick, or staffing assignment.

## API

`src/domain/facilityDependencyGraph.ts`

| Function                                    | Behavior                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `validateFacilityDependencyGraph`           | Normalize a graph or return one stable rejection and no graph.                                                    |
| `normalizeFacilityDependencyGraph`          | Validated graph, or `undefined` when rejected.                                                                    |
| `resolveFacilityDependencyAvailability`     | Results for a valid graph and complete source map. A rejected graph returns that same rejection and no `results`. |
| `readRepresentativeFacilityDependencyGraph` | Frozen representative fixture. Throws if that fixture fails validation.                                           |

Node roles are `core`, `service`, and `capability`. A valid graph has exactly one `core`. Edges are directed: `fromNodeId` is the upstream, `toNodeId` is the dependent. `edgeClass` must be `functional_dependency`. `relation` must be `requires`. `spatial_adjacency` and any other class or relation are `forbidden_edge_kind`.

## Precedence and causes

Worst availability wins: `unavailable`, then `degraded`, then `ready`. Every node needs its own source. A node stays on that source unless an upstream result is strictly worse. Equal worse upstreams select the smallest node id. Independent nodes keep their own source.

Reasons are `source_condition`, `upstream_degraded`, and `upstream_unavailable`. When an upstream is strictly worse, the result names that immediate upstream and the root of the chosen path. `causeChain` lists those upstream ids sorted by code unit. Result rows are also sorted by node id, so insertion order does not change either list.

## Failure and bounds

Rejections are `malformed`, `graph_too_large`, `duplicate_node`, `invalid_core`, `forbidden_edge_kind`, `missing_endpoint`, `cycle`, `invalid_source`, and `unsupported_state`. A directed cycle, including a self-requirement, rejects the whole graph before any availability is returned. More than 32 nodes or 64 edges rejects as `graph_too_large`. Validation and resolution each walk nodes and edges a constant number of times, so the representative fixture is linear in that closed bound.

The representative fixture is `core:facility_hub`, `service:routing` requiring the hub, `capability:alert_timing` requiring routing, `capability:logistics_freshness` requiring the hub, and `service:archive_integrity` with no hub edge. Hub `degraded` degrades routing, alert timing, and logistics freshness. Hub `unavailable` makes those three unavailable. Archive integrity keeps its own source.

## Upstream contracts

SPE-2932 remains the spatial graph. A `functional_dependency` edge still fails that validator as `malformed`. The dependency module does not import the spatial module. The contract test checks both. SPE-3382 is Done and does not block this caller-supplied kernel. SPE-3386 owns later live effect and status mapping. SPE-2779 remains the workshop aggregate gate. SPE-3147 and SPE-3135 remain staffing assignment and capacity.

## Deferred

| Item                                              | Owner                                                                                                                 | Why deferred                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Live lifecycle, effect, utility, or status inputs | [SPE-3386](https://linear.app/spectranoir/issue/SPE-3386)                                                             | This kernel accepts explicit caller sources only.               |
| Room or module unlock and liability               | [SPE-792](https://linear.app/spectranoir/issue/SPE-792)                                                               | Parent acceptance remains outside this child.                   |
| Core displacement clues                           | [SPE-792](https://linear.app/spectranoir/issue/SPE-792)                                                               | Parent acceptance remains outside this child.                   |
| Facility-to-post validity                         | [SPE-3387](https://linear.app/spectranoir/issue/SPE-3387)                                                             | Separate approved boundary. Staffing owners stay authoritative. |
| Supported unlock versus usable support            | [SPE-3388](https://linear.app/spectranoir/issue/SPE-3388)                                                             | Separate approved boundary.                                     |
| Workshop or readiness integration                 | [SPE-2779](https://linear.app/spectranoir/issue/SPE-2779) / [SPE-3386](https://linear.app/spectranoir/issue/SPE-3386) | Do not feed the workshop gate from this slice.                  |
| Persistence, hydration, week-close, UI            | none in this child                                                                                                    | No GameState field and no schema change.                        |
