# SPE-2788 — Deterministic department workshop activation from completed construction

| Field               | Value                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2788](https://linear.app/spectranoir/issue/SPE-2788/deterministic-department-workshop-activation-from-completed)                                                         |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                                                                      |
| **Related owners**  | [SPE-110](https://linear.app/spectranoir/issue/SPE-110), [SPE-2747](https://linear.app/spectranoir/issue/SPE-2747), [SPE-2787](https://linear.app/spectranoir/issue/SPE-2787) |
| **Status**          | **Shipped**                                                                                                                                                                   |
| **Branch**          | `agent/spe-2788-department-workshop-activation`                                                                                                                               |
| **Base `main` SHA** | `142152df`                                                                                                                                                                    |

## Goal

Create the authoritative empty workshop snapshot required by canonical routing
only after a caller names an existing department, a completed SPE-110
construction case, and an exact structural route in that case's map layer.

## Boundary

### In scope

- Pure validation of a normalized department, construction case, route, and positive slot capacity
- Exact SPE-110 construction-completion and case map-route proof
- One immutable empty canonical workshop snapshot with stable registry ordering
- Idempotent identical activation and fail-closed conflicting activation
- Store persistence only for newly activated workshop state
- Save/hydration verification through the existing SPE-2747 schema

### Out of scope

- Advancing construction clocks or automatically selecting completed cases
- Inferring workshop capacity, department ownership, or routes from facilities or topology
- Resizing, deactivating, demolishing, relocating, or repairing workshops
- Authoring or routing work orders as part of activation
- New persistence fields, week-close hooks, queues, UI, safety, quality, or clutter consequences

## Acceptance

- [x] Normalized requests require a registered department and positive safe-integer capacity
- [x] Activation requires an existing case with a completed SPE-110 construction clock
- [x] Activation requires an exact structural route in the construction case map layer
- [x] Success creates one empty frozen snapshot without mutating source state
- [x] Identical replay is unchanged; conflicting capacity or occupancy fails closed
- [x] Malformed canonical workshop state fails closed instead of being repaired implicitly
- [x] Registry and persisted-map insertion order do not affect the authored snapshot
- [x] The store persists activated registries only and preserves blocked/unchanged game identity
- [x] Activated workshop state survives the existing save/hydration seam

## Deferred

| Item                                          | Owner               | Why deferred                                                               |
| --------------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| Construction progression and completion event | SPE-110 follow-on   | This slice consumes but does not advance the canonical construction clock  |
| Facility/topology ownership inference         | New SPE-1028 child  | Activation requires explicit IDs rather than inventing an authority mapper |
| Capacity resize and workshop lifecycle        | New SPE-1028 child  | Existing snapshots are intentionally immutable activation conflicts        |
| Activation UI and player command              | New SPE-1028 child  | This slice establishes the deterministic domain/store seam only            |
| Clutter, safety, and quality consequences     | SPE-1028 follow-ons | Those effects remain owned by their existing processing/output contracts   |

Parent SPE-1028 remains Backlog after this bounded child ships.
