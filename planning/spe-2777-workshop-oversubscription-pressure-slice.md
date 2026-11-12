# SPE-2777 — Deterministic workshop oversubscription throughput pressure

| Field               | Value                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2777](https://linear.app/spectranoir/issue/SPE-2777/deterministic-workshop-oversubscription-throughput-pressure) |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)              |
| **Status**          | **Shipped**                                                                                                           |
| **Branch**          | `agent/spe-2777-workshop-oversubscription-pressure`                                                                   |
| **Base `main` SHA** | `064a8ec9d21de5cf4964a0f92e18fd6da8c45da6`                                                                            |

## Goal

Add pure caller-owned workshop load pressure so explicit overload suppresses
transient throughput bonuses without stalling baseline processing or inferring
live labor and facility capacity.

## Boundary

### In scope

- Transient `normal` and `overloaded` load-pressure classifications
- A frozen fail-closed resolver with an explicit one- or two-unit throughput cap
- Overload suppression of SPE-2775 adjacency and SPE-2776 centralized staffing
- Optional exact-department pressure inputs on the canonical registry tick
- Focused regressions, workshop audit, and backlog handoff

### Out of scope

- Persisted pressure, slot-capacity mutation, schema, hydration, or store writes
- Live labor, staffing, facility, room, equipment, or topology inference
- Zero-work stalls, failure consequences, or incident spawning
- SPE-2084 duration or coordination policy
- UI or an additional week-close hook

## Acceptance criteria

- [x] Explicit overload caps processing at one work unit
- [x] Normal, omitted, and malformed pressure preserve existing throughput
- [x] Overload suppresses adjacency, centralized staffing, and their capped composition
- [x] Baseline work continues advancing under overload
- [x] Distributed breach-isolation metadata remains independent
- [x] Pressure inputs cannot affect sibling departments
- [x] Registry insertion order does not change replay
- [x] Paused progress, completion/backfill timing, frozen outputs, and slot capacity are preserved
- [x] Pressure is absent from persisted state and SPE-2084 projections remain unchanged
- [x] Context-free `advanceWeek` behavior and hook count remain unchanged

## Deferred

| Item                                       | Owner                          | Why deferred                                                  |
| ------------------------------------------ | ------------------------------ | ------------------------------------------------------------- |
| Live staffing/facility pressure projection | Create SPE-1028 child          | This slice accepts caller-owned transient classification only |
| Zero-work or overload failure consequence  | Create SPE-1028 child          | Overload suppresses bonuses but preserves baseline work       |
| Duration-aware SPE-2084 policy             | Create SPE-1028/SPE-2084 child | Coordination remains current-occupancy based                  |
| Dependency and upgrade behavior            | Create SPE-1028 child          | Separate remaining parent acceptance boundary                 |
| Live facility/staff safety mapping         | SPE-2772                       | Shipped through SPE-2772 / PR #3462; broader operational projection remains separate                         |

Parent SPE-1028 remains open after this bounded child ships.
