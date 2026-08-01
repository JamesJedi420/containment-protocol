# SPE-2779 — Deterministic workshop dependency availability gate

| Field               | Value                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2779](https://linear.app/spectranoir/issue/SPE-2779/deterministic-workshop-dependency-availability-gate) |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)      |
| **Related owner**   | [SPE-792](https://linear.app/spectranoir/issue/SPE-792/facility-core-dependency-graph)                        |
| **Status**          | **Shipped**                                                                                                   |
| **Branch**          | `agent/spe-2779-workshop-dependency-gate`                                                                     |
| **Base `main` SHA** | `85ea3bf3332ec627c356dc510ac5caa61e332bd7`                                                                    |

## Goal

Add pure caller-owned aggregate dependency availability so degraded workshop
dependencies suppress optional efficiency and unavailable dependencies block a
tick without starting queued work or inferring a live facility graph.

## Boundary

### In scope

- Transient `ready`, `degraded`, and `unavailable` dependency availability
- A frozen neutral-fallback resolver with a zero-, one-, or two-unit cap
- Degraded composition with staging, operating mode, and load pressure
- An intentional unavailable-dependency block before slot fill or progress
- Optional exact-department dependency inputs on the canonical registry tick
- Focused regressions, workshop audit, and backlog handoff

### Out of scope

- SPE-792 dependency-graph traversal, named edges, or failure propagation
- Persisted dependency state, schema, hydration, store writes, or slot changes
- Live facility, utility, storage, staff, training, logistics, or topology inference
- Completion quality/safety grading, cancellation proof, or incident spawning
- SPE-2084 duration policy, UI, or an additional week-close hook

## Acceptance criteria

- [x] Ready, omitted, and malformed availability preserve current throughput
- [x] Degraded availability caps adjacency and centralized staffing at one unit
- [x] Degraded plus overloaded reports deterministic combined-cap metadata
- [x] Unavailable availability blocks before slot fill, progress, or backfill
- [x] The unavailable block returns a frozen validated snapshot and stable reason
- [x] Dependency inputs cannot affect sibling departments
- [x] Registry insertion order does not change replay or reason ordering
- [x] Dependency context is not persisted and nested outputs remain frozen
- [x] Slot capacity, paused progress, backfill timing, and SPE-2084 projections remain unchanged
- [x] Context-free `advanceWeek` behavior and hook count remain unchanged

## Deferred

| Item                                 | Owner                          | Why deferred                                                  |
| ------------------------------------ | ------------------------------ | ------------------------------------------------------------- |
| Live dependency graph projection     | SPE-792 / create adapter child | This slice accepts aggregate transient availability only      |
| Named dependency-edge diagnostics    | SPE-792                        | Requires the graph owner rather than workshop-local invention |
| Dependency-driven output degradation | Create SPE-1028 child          | Completion quality remains a separate caller-owned contract   |
| Behavioral workshop upgrade paths    | Create SPE-1028 child          | Separate remaining parent acceptance boundary                 |
| Duration-aware SPE-2084 policy       | Create SPE-1028/SPE-2084 child | Coordination remains current-occupancy based                  |
| Live facility/staff safety mapping   | SPE-2772                       | Explicit mapping seam remains blocked                         |

Parent SPE-1028 remains open after this bounded child ships.
