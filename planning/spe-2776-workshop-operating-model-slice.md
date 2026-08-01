# SPE-2776 — Deterministic centralized-versus-distributed workshop operating model

| Field               | Value                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2776](https://linear.app/spectranoir/issue/SPE-2776/deterministic-centralized-versus-distributed-workshop-operating-model) |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                        |
| **Status**          | **Shipped**                                                                                                                     |
| **Branch**          | `agent/spe-2776-workshop-operating-model`                                                                                       |
| **Base `main` SHA** | `6008ee8398777c4c0238f6917ce3e7d5fa3bb8db`                                                                                      |

## Goal

Add a pure caller-owned operating model where centralized workshops gain bounded
staffing efficiency and distributed workshops expose an explicit breach-isolation
advantage without inferring live topology.

## Boundary

### In scope

- Transient `centralized` and `distributed` operating modes
- One centralized staffing work unit composed with SPE-2775 adjacency
- A hard two-work-unit cap when both throughput effects apply
- Explicit metadata-only distributed breach isolation
- Optional exact-department operating-mode inputs on the canonical registry tick
- Focused regressions, workshop audit, and backlog handoff

### Out of scope

- Persisted operating mode, slot-capacity mutation, schema, hydration, or store writes
- Live topology or department/facility/staff/equipment mapping
- SPE-2084 duration or coordination policy
- Safety grading, unsafe-incident spawning, or numeric risk modification
- UI or an additional week-close hook

## Acceptance criteria

- [x] Centralized mode contributes one staffing work unit
- [x] Distributed mode exposes breach-isolation metadata without changing throughput
- [x] Omitted and malformed modes preserve the neutral one-unit baseline
- [x] Centralized staffing and full adjacency remain capped at two work units
- [x] Distributed adjacency retains both adjacency throughput and isolation classification
- [x] Operating-mode inputs cannot affect sibling departments
- [x] Registry insertion order does not change replay
- [x] Paused progress, completion/backfill timing, frozen outputs, and slot capacity are preserved
- [x] SPE-2084 workload projection and context-free `advanceWeek` behavior remain unchanged

## Deferred

| Item                                    | Owner                          | Why deferred                                                 |
| --------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| Live facility/staff safety mapping      | SPE-2772                       | Explicit mapping seam remains blocked                        |
| Persisted topology-to-mode projection   | Create SPE-1028 child          | This slice accepts caller-owned transient modes only         |
| Isolation incident consequence consumer | Create SPE-1028 child          | Metadata must not imply that an incident rule already exists |
| Duration-aware SPE-2084 policy          | Create SPE-1028/SPE-2084 child | Coordination remains current-occupancy based                 |
| Dependency and upgrade behavior         | Create SPE-1028 child          | Separate remaining parent acceptance boundary                |

Parent SPE-1028 remains open after this bounded child ships.
