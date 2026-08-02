# SPE-2785 — Deterministic workshop automated-diagnostics eligibility gate

| Field               | Value                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2785](https://linear.app/spectranoir/issue/SPE-2785/deterministic-workshop-automated-diagnostics-eligibility-gate)                                                                                  |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                                                                                                 |
| **Related owners**  | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control), [SPE-21](https://linear.app/spectranoir/issue/SPE-21/base-upgrade-and-facility-progression) |
| **Status**          | **Shipped**                                                                                                                                                                                              |
| **Branch**          | `agent/spe-2785-workshop-automated-diagnostics-gate`                                                                                                                                                     |
| **Base `main` SHA** | `db3af64be5f18a002793f2b39b913099adcfe54b`                                                                                                                                                               |

## Goal

Allow explicit caller-owned automated-diagnostics capability to gate queued
workshop starts without projecting live facility or equipment state, altering
throughput, or stalling work that is already active.

## Boundary

### In scope

- Transient `manual` and `automated` department profiles
- Transient `standard` and `automated_diagnostic` per-work-order requirements
- Frozen neutral-fallback eligibility results
- Strict FIFO after certification and dedicated-station eligibility
- Exact-department registry context and deterministic blocker reasons
- Focused queue, persistence, coordination, and week-close regressions

### Out of scope

- Persisted automation state, schema, hydration, or store actions
- Facility/upgrade, task-kind, equipment-integrity, staffing, or topology inference
- Maintenance consumption, inspection, corruption, or failure consequences
- Throughput, routing, anomaly specialization, quality/safety, incidents, or UI

## Acceptance

- [x] Standard work starts under manual, automated, omitted, or malformed profiles
- [x] Automated-diagnostic work starts only under an explicit automated profile
- [x] Missing and malformed context resolves through neutral fallbacks
- [x] Certification and station blockers retain earlier precedence
- [x] A blocked queue head remains queued and later work is not bypassed
- [x] Active work continues and ineligible completion backfill does not start
- [x] Exact-department/work-order inputs replay deterministically without persistence
- [x] Throughput, slot capacity, SPE-2084 projections, and `advanceWeek` remain unchanged

## Deferred

| Item                                        | Owner                        | Why deferred                                              |
| ------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| Live facility/upgrade automation projection | SPE-21 / create adapter      | This slice accepts explicit caller-owned context only     |
| Automation inspection and integrity         | SPE-877                      | No canonical workshop-facing integrity contract exists    |
| Maintenance specialist consumption          | SPE-94 / SPE-877 follow-up   | Eligibility does not replace or consume staffing capacity |
| Corruption and diagnostic failure           | SPE-877 / new SPE-1028 child | Requires explicit failure and completion-outcome policy   |
| Anomaly-class specialization                | Create SPE-1028 child        | Requires specialization and routing rules to be authored  |
| Automation-driven quality or safety         | Create SPE-1028 child        | Start eligibility remains independent of receipt grading  |
| Player-facing automation controls           | SPE-21 / UI child            | No UI or store action is introduced                       |

Parent SPE-1028 remains open after this bounded child ships.
