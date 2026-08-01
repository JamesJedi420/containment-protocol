# SPE-2781 — Deterministic degraded-dependency workshop output quality

| Field               | Value                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2781](https://linear.app/spectranoir/issue/SPE-2781/deterministic-degraded-dependency-workshop-output-quality) |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)            |
| **Related owners**  | [SPE-792](https://linear.app/spectranoir/issue/SPE-792/facility-core-dependency-graph), SPE-2779                    |
| **Status**          | **Shipped**                                                                                                         |
| **Branch**          | `agent/spe-2781-workshop-dependency-output-quality`                                                                 |
| **Base `main` SHA** | `82f8fc52a577da4b9eaf335af7c76e0844a4e0b0`                                                                          |

## Goal

Map explicit caller-owned degraded workshop dependency availability into the
existing completion-quality contract without transporting transient processing
context through the canonical tick or inferring the live facility graph.

## Boundary

### In scope

- A frozen dependency-availability-to-quality adapter
- An optional dependency quality axis on existing per-work-order conditions
- Durable `poor_dependency_condition` receipt reasoning
- Stable input → specialist → room → dependency reason precedence
- Receipt sanitization, authoritative reason labeling, and focused regressions

### Out of scope

- SPE-792 graph traversal, named edges, or live facility/topology projection
- Automatic processing-tick-to-receipt context transport
- New persisted fields, schema versions, hydration rules, or store actions
- Dependency-driven task failure, safety changes, incidents, or UI components
- Throughput, slot capacity, SPE-2084 policy, or additional week-close hooks

## Acceptance

- [x] Only `degraded` maps to a poor dependency condition
- [x] Ready, unavailable, omitted, and malformed availability remain neutral
- [x] Existing quality reasons retain deterministic precedence
- [x] Exact-work-order quality inputs cannot affect sibling completions
- [x] Receipts persist the new reason without persisting dependency context
- [x] Existing receipts win on replay and nested results remain frozen
- [x] Safety, queue behavior, SPE-2084 projections, and `advanceWeek` remain unchanged

## Deferred

| Item                                 | Owner                         | Why deferred                                                     |
| ------------------------------------ | ----------------------------- | ---------------------------------------------------------------- |
| Live dependency graph projection     | SPE-792 / adapter child       | This slice accepts explicit aggregate caller context only        |
| Named dependency-edge diagnostics    | SPE-792                       | Requires the authoritative graph owner                           |
| Automatic week-close quality mapping | Create SPE-1028 mapping child | Requires an explicit department/facility/work-order mapping seam |
| Dependency-driven task failure       | Create SPE-1028 child         | Completion quality is not terminal proof                         |
| Live facility/staff safety mapping   | SPE-2772                      | Explicit safety mapping seam remains blocked                     |

Parent SPE-1028 remains open after this bounded child ships.
