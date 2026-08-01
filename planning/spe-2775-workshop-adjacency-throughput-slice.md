# SPE-2775 — Deterministic adjacency-sensitive workshop staging throughput

| Field               | Value                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2775](https://linear.app/spectranoir/issue/SPE-2775/deterministic-adjacency-sensitive-workshop-staging-throughput) |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                |
| **Status**          | **Shipped**                                                                                                             |
| **Branch**          | `agent/spe-2775-workshop-adjacency-throughput`                                                                          |
| **Base `main` SHA** | `b30052ba666fdd06c016ca0599b5d67f64f68866`                                                                              |

## Goal

Make the canonical workshop tick sensitive to caller-owned nearby staging while
preserving the existing one-unit baseline for every caller that has no explicit
adjacency context.

## Boundary

### In scope

- Pure input/output staging conditions (`adjacent` or `remote`)
- Two work units only when both staging axes are adjacent
- Optional department-keyed conditions on the registry processing tick
- Existing queue, slot, completion, determinism, and immutability contracts
- Focused tests, workshop audit, and backlog handoff

### Out of scope

- Facility topology persistence, hydration, or store actions
- Live department/facility/staff/equipment mapping
- Additional week-close hooks or non-baseline `advanceWeek` inputs
- SPE-2084 duration policy or centralization/distribution effects
- Workshop UI changes

## Acceptance criteria

- [x] Fully adjacent input/output staging advances two work units
- [x] Remote, partial, omitted, and malformed conditions advance one unit
- [x] Accelerated completion backfills without advancing the replacement
- [x] Department-keyed conditions cannot affect sibling departments
- [x] Registry insertion order does not change results
- [x] Inputs remain immutable and nested results remain frozen
- [x] `advanceWeek` retains its single baseline workshop tick

## Deferred

| Item                                        | Owner                          | Why deferred                                              |
| ------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| Live facility/staff safety mapping          | SPE-2772                       | Explicit mapping seam remains blocked                     |
| Persisted topology-to-staging projection    | Create SPE-1028 child          | This slice accepts caller-owned classifications only      |
| Duration-aware SPE-2084 coordination policy | Create SPE-1028/SPE-2084 child | Coordination delay remains current-occupancy based        |
| Centralized/distributed workroom tradeoffs  | Create SPE-1028 child          | Requires layout, staffing, and breach-isolation policy    |
| Player-facing staging explanation           | Future topology/UI integration | No authoritative live staging source exists in this slice |

Parent SPE-1028 remains open after this bounded child ships.
