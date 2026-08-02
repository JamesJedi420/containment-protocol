# SPE-2786 — Deterministic workshop anomaly-class specialization eligibility gate

| Field               | Value                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2786](https://linear.app/spectranoir/issue/SPE-2786/deterministic-workshop-anomaly-class-specialization-eligibility-gate)                                                      |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                                                                            |
| **Related owners**  | [SPE-792](https://linear.app/spectranoir/issue/SPE-792/facility-core-dependency-graph), [SPE-21](https://linear.app/spectranoir/issue/SPE-21/base-upgrade-and-facility-progression) |
| **Status**          | **Shipped**                                                                                                                                                                         |
| **Branch**          | `agent/spe-2786-workshop-anomaly-specialization-gate`                                                                                                                               |
| **Base `main` SHA** | `df8b5583`                                                                                                                                                                          |

## Goal

Allow explicit caller-owned anomaly-class specialization to gate queued
workshop starts without projecting live facility or anomaly state, altering
throughput, or stalling work that is already active.

## Boundary

### In scope

- Transient profiles containing canonical supported anomaly-class IDs
- Transient exact-work-order anomaly-class requirements
- Trimmed, deduplicated, stable-order profile normalization
- Neutral fallback for missing or malformed requirements
- Strict FIFO after certification, dedicated-station, and automation eligibility
- Exact-department registry context and deterministic blocker reasons
- Focused queue and canonical processing-tick regressions

### Out of scope

- Persisted specialization state, schema, hydration, or store actions
- Live anomaly, facility/upgrade, research, staffing, equipment, or task-kind inference
- Automatic routing or department selection from anomaly class
- Throughput, quality/safety, incidents, rewards, unlock progression, or UI
- Any additional `advanceWeek` hook

## Acceptance

- [x] Standard work starts with omitted or malformed specialization requirements
- [x] Class-required work starts only when the exact profile supports that class
- [x] Profile IDs normalize by trim, deduplication, and stable code-unit order
- [x] Missing, mismatched, and malformed profiles fail closed for valid requirements
- [x] Certification, station, and automation blockers retain earlier precedence
- [x] A blocked queue head remains queued and later work is not bypassed
- [x] Active work continues and ineligible completion backfill does not start
- [x] Exact-department/work-order inputs replay deterministically without persistence
- [x] Throughput, slot capacity, output grading, and `advanceWeek` remain unchanged

## Deferred

| Item                                            | Owner                   | Why deferred                                                        |
| ----------------------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| Live facility/upgrade specialization projection | SPE-21 / create adapter | This slice accepts explicit caller-owned context only               |
| Facility dependency graph integration           | SPE-792                 | Eligibility does not infer dependency or room operational state     |
| Anomaly-class work-order routing                | New SPE-1028 child      | Start eligibility does not choose a department or author work       |
| Specialization-driven quality or safety         | New SPE-1028 child      | Start eligibility remains independent of completion receipt grading |
| Player-facing specialization controls           | SPE-21 / UI child       | No UI or store action is introduced                                 |

Parent SPE-1028 remains open after this bounded child ships.
