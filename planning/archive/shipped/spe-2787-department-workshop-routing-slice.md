# SPE-2787 — Deterministic specialized-department workshop work-order routing

| Field               | Value                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2787](https://linear.app/spectranoir/issue/SPE-2787/deterministic-specialized-department-workshop-work-order-routing)                                                      |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                                                                        |
| **Related owners**  | [SPE-2083](https://linear.app/spectranoir/issue/SPE-2083), [SPE-2084](https://linear.app/spectranoir/issue/SPE-2084), [SPE-2752](https://linear.app/spectranoir/issue/SPE-2752) |
| **Status**          | **Shipped**                                                                                                                                                                     |
| **Branch**          | `agent/spe-2787-department-workshop-routing`                                                                                                                                    |
| **Base `main` SHA** | `760b18ab`                                                                                                                                                                      |

## Goal

Compose the existing department resolver, canonical workshop workload
projection, coordination evaluator, and enqueue seam so one case-owned work
order is routed to a matched specialized primary department and admitted under
the real queue and capacity state.

## Boundary

### In scope

- Pure route-and-enqueue composition over existing domain owners
- Primary and supporting department workload projection in stable ID order
- Capacity, queue-delay, and doctrine coordination metadata before admission
- One primary-department work order with the resolver-owned task type
- Atomic store persistence only after canonical enqueue succeeds
- Explicit routing/projection/coordination/enqueue block-stage reporting

### Out of scope

- Department construction, activation, or synthesized workshop snapshots
- Persistence schema, hydration, UI, global case queue, or week-close changes
- Duration-aware capacity or delaying physical enqueue until a future week
- Live facility, staffing, safety, quality, failure-mode, or specialization-profile inference
- Duplicate supporting-department work orders

## Acceptance

- [x] Specialization deterministically selects the primary department and task type
- [x] Every assigned department contributes its canonical workload projection
- [x] Zero capacity and missing or malformed workload state fail closed
- [x] Aligned, delayed, and disputed coordination may enqueue at the primary queue tail
- [x] Fallback/misfit routing never authors specialized work
- [x] Canonical enqueue retains ownership of request and duplicate-work validation
- [x] Store writes only successful workshop registries and preserves blocked state identity
- [x] Equal input replays immutably without RNG, clock, or input-order dependence

## Deferred

| Item                                         | Owner                  | Why deferred                                                         |
| -------------------------------------------- | ---------------------- | -------------------------------------------------------------------- |
| Department construction and activation       | New SPE-1028 child     | Routing requires an already-authoritative workshop snapshot          |
| Live specialization-profile projection       | SPE-21 / adapter child | This slice routes by the existing capability registry only           |
| Duration-aware coordination throughput       | New SPE-1028 child     | SPE-2084 retains its current bounded occupancy formula               |
| Failure-mode consequences after admission    | New SPE-1028 child     | Routing exposes coordination but does not invent completion outcomes |
| Live facility quality and safety projections | SPE-2771 / SPE-2772    | Their explicit authoritative mapping seams remain separate           |

Parent SPE-1028 remains Backlog after this bounded child ships.
