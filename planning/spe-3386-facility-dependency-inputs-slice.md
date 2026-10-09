# SPE-3386 — Explicit facility dependency inputs

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                      |
| **Issue**         | [SPE-3386](https://linear.app/spectranoir/issue/SPE-3386)                 |
| **GitHub**        | [#4280](https://github.com/JamesJedi420/containment-protocol/issues/4280) |
| **Parent**        | [SPE-792](https://linear.app/spectranoir/issue/SPE-792) — Backlog         |
| **Umbrella**      | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog       |
| **Branch**        | `cursor/spe-3386-facility-dependency-inputs`                              |
| **Base main SHA** | `c9ca313489e8a4c25a78fe2a58e1f78026e10682`                                |

Status and backlog classification describe the merge handoff and take effect on merge. Keep Linear In Progress until review, CI, and merge are verified. Closing this child does not close SPE-792 or SPE-1052.

## Approved boundary

Project explicit provenance-bearing availability facts through the SPE-3383 resolver. GitHub #4280 is the Linear linkback for SPE-3386. Its body requires one authoritative input that changes two downstream capabilities, stable fail-closed reasons, unchanged independent services, and no second persisted availability ledger. It also forbids a blanket status filter, a GameState mirror, a week-close hook, and invented fallback sources for owners whose contracts are not this slice.

SPE-3382 is Done. Comment `c6111693-1cf2-4b40-be6c-84a48de60bac` folds F1, F4, F6, and F7 here: installed effects stay installed, lifecycle status is not effective availability, and missing or malformed live sources fail closed before the permissive SPE-2779 seam. This slice does not integrate effect families.

## API

`src/domain/facilityDependencyInputs.ts`

| Function                                        | Behavior                                                                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `mapExplicitFacilityDependencySources`          | Validate a packet into a complete source map, or return one rejection and no sources. An invalid graph returns that kernel rejection unchanged. |
| `resolveExplicitFacilityDependencyAvailability` | Map the packet, then call `resolveFacilityDependencyAvailability`. Source failure returns no node results.                                      |

Each graph node needs `availability` of `ready`, `degraded`, or `unavailable` and a nonempty `sourceRef`. Missing nodes are not defaulted to ready. Packet key order does not change the resolution. The kernel still applies worst-wins causes. `FACILITY_DEPENDENCY_REJECTIONS` is unchanged.

Adapter rejections, checked before node construction, are `malformed_source`, `unsupported_status_filter`, and `missing_source`. A lifecycle status word used as availability or as a top-level `status` is `unsupported_status_filter`. A facility instance, installed effect key, unknown id, or other shape is `malformed_source`. A missing node or blank `sourceRef` is `missing_source`.

On the representative graph, hub `degraded` or `unavailable` changes alert timing and logistics freshness. Routing `degraded` changes alert timing only. Archive integrity keeps its own source.

## Upstream contracts

SPE-3383 remains the pure kernel. SPE-2932 remains the spatial graph. SPE-3380 status readers stay lifecycle authority and are not an availability alias. SPE-2779 still treats omitted or malformed workshop context as baseline throughput; this adapter does not call it. SPE-3119 remains the live maintenance-debt feed. SPE-3147 and SPE-3135 remain staffing assignment and capacity. Utilities, supply, control, equipment, and research execution stay with their existing owners.

## Validation

Focused regression passed **76 tests across five files**: the new input contract, the SPE-3383 kernel contract, the spatial section graph, facility lifecycle, and facility effects. Lint on the new domain and test files passed. `npm run verify:backlog-handoff` passed.

## Deferred

| Item                                                       | Owner                                                     | Why deferred                                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Workshop or readiness integration                          | [SPE-2779](https://linear.app/spectranoir/issue/SPE-2779) | Absent inputs stay on the existing permissive seam. Do not feed this adapter into the workshop tick. |
| Lifecycle, utility, staffing, supply, control, maintenance | Existing owners named by SPE-3386                         | Consume those contracts only in their own slices. Do not invent a fallback source.                   |
| Research execution and installed-effect families           | [SPE-3343](https://linear.app/spectranoir/issue/SPE-3343) | Installed effects are not effective availability.                                                    |
| Facility-to-post validity                                  | [SPE-3387](https://linear.app/spectranoir/issue/SPE-3387) | Separate approved boundary.                                                                          |
| Supported unlock versus usable support                     | [SPE-3388](https://linear.app/spectranoir/issue/SPE-3388) | Separate approved boundary.                                                                          |
| Room or module unlock, liability, and core displacement    | [SPE-792](https://linear.app/spectranoir/issue/SPE-792)   | Parent acceptance remains outside this child.                                                        |
| Persistence, hydration, week-close, UI                     | none in this child                                        | No GameState field and no schema change.                                                             |
