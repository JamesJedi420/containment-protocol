# SPE-2784 — Deterministic workshop dedicated-station eligibility gate

| Field               | Value                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Linear**          | [SPE-2784](https://linear.app/spectranoir/issue/SPE-2784/deterministic-workshop-dedicated-station-eligibility-gate)                                                                                          |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                                                                                                     |
| **Related owners**  | [SPE-2780](https://linear.app/spectranoir/issue/SPE-2780/deterministic-workshop-certification-eligibility-gate), [SPE-21](https://linear.app/spectranoir/issue/SPE-21/base-upgrade-and-facility-progression) |
| **Status**          | **Shipped**                                                                                                                                                                                                  |
| **Branch**          | `agent/spe-2784-workshop-dedicated-station-gate`                                                                                                                                                             |
| **Base `main` SHA** | `8b96dc7003ee137dac74b68fd32da9d760816b1a`                                                                                                                                                                   |

## Goal

Allow explicit caller-owned dedicated-station capability to gate queued
workshop starts without projecting live facility upgrades, altering throughput,
or stalling work that is already active.

## Boundary

### In scope

- Transient `basic` and `dedicated` station profiles
- Transient `standard` and `dedicated` per-work-order start requirements
- Frozen neutral-fallback eligibility results
- Strict FIFO with certification-first blocker precedence
- Exact-department registry context and deterministic blocker reasons
- Focused queue, persistence, coordination, and week-close regressions

### Out of scope

- Persisted station/profile state, schema, hydration, or store actions
- Live facility, upgrade-level, construction, room, or topology inference
- Automation, anomaly-class specialization, or rerouting
- Throughput, completion quality/safety, incidents, UI, or hook changes

## Acceptance

- [x] Standard work starts under basic or dedicated station profiles
- [x] Dedicated-required work starts only under an explicit dedicated profile
- [x] Missing and malformed context resolves through neutral fallbacks
- [x] Certification remains primary when both start gates fail
- [x] A blocked queue head remains queued and later work is not bypassed
- [x] Active work continues and ineligible completion backfill does not start
- [x] Exact-department/work-order inputs replay deterministically without persistence
- [x] Throughput, slot capacity, SPE-2084 projections, and `advanceWeek` remain unchanged

## Deferred

| Item                               | Owner                        | Why deferred                                             |
| ---------------------------------- | ---------------------------- | -------------------------------------------------------- |
| Live station/upgrade projection    | SPE-21 / create adapter      | This slice accepts explicit caller-owned context only    |
| Construction and activation timing | SPE-110 / SPE-1028 follow-up | Eligibility does not mutate facility lifecycle state     |
| Automated diagnostic behavior      | Create SPE-1028 child        | Requires maintenance and corruption failure contracts    |
| Anomaly-class specialization       | Create SPE-1028 child        | Requires authored specialization and routing rules       |
| Station-driven completion quality  | Create SPE-1028 child        | Start eligibility remains independent of receipt grading |
| Station-driven safety or incidents | SPE-2772 / follow-up         | Live safety mapping seam remains blocked                 |
| Player-facing upgrade controls     | SPE-21 / UI child            | No UI or store action is introduced here                 |

Parent SPE-1028 remains open after this bounded child ships.
