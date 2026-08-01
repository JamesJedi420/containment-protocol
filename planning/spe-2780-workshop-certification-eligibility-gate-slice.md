# SPE-2780 — Deterministic workshop certification eligibility gate

| Field               | Value                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2780](https://linear.app/spectranoir/issue/SPE-2780/deterministic-workshop-certification-eligibility-gate)              |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                     |
| **Related owner**   | [SPE-1058](https://linear.app/spectranoir/issue/SPE-1058/specialist-labor-task-gating-and-skill-dependent-production-system) |
| **Status**          | **Shipped**                                                                                                                  |
| **Branch**          | `agent/spe-2780-workshop-certification-gate`                                                                                 |
| **Base `main` SHA** | `7308066a0003cd94b3b5b93eec72ec4e9a7885b0`                                                                                   |

## Goal

Add a pure caller-owned certification gate that changes which queued workshop
orders may start without altering throughput, persistence, facility upgrades,
or progress for work that is already active.

## Boundary

### In scope

- Transient `basic` and `certified` department profiles
- Transient `standard` and `certified` per-work-order start requirements
- Frozen neutral-fallback eligibility results
- Strict FIFO blocking at the first certification-ineligible queued order
- Exact-department registry context and deterministic blocker reasons
- Focused queue, persistence, coordination, and week-close regressions

### Out of scope

- Persisted certification/profile state, schema, hydration, or store actions
- Facility-level, staff, skill, clearance, or topology inference
- Dedicated stations, automation, anomaly-class specialization, or rerouting
- Completion quality/safety, incidents, UI, or additional week-close hooks

## Acceptance

- [x] Standard work starts under every valid, omitted, or malformed profile
- [x] Certified-required work starts only under a certified profile
- [x] Certification-blocked queue heads are not bypassed
- [x] Already-active work continues and paused work remains unchanged
- [x] Zero-slot and unavailable-dependency reason precedence is preserved
- [x] Exact-department and exact-work-order isolation replays deterministically
- [x] Inputs and nested outputs remain immutable and frozen
- [x] Certification context is not persisted and slot capacity is unchanged
- [x] SPE-2084 projections and context-free `advanceWeek` remain unchanged

## Deferred

| Item                               | Owner                         | Why deferred                                                   |
| ---------------------------------- | ----------------------------- | -------------------------------------------------------------- |
| Live staff/skill projection        | SPE-1058 / create adapter     | This slice accepts explicit caller-owned certification only    |
| Dedicated-station behavior         | Create SPE-1028 child         | Separate upgrade behavior beyond certification eligibility     |
| Automated diagnostic behavior      | SPE-1028 / SPE-1058 follow-up | Requires explicit maintenance and corruption failure contracts |
| Anomaly-class specialization       | Create SPE-1028 child         | Requires authored specialization requirements and routing      |
| Certification-driven output grade  | Create SPE-1028 child         | Completion quality remains an independent caller-owned seam    |
| Live facility/staff safety mapping | SPE-2772                      | Explicit mapping seam remains blocked                          |

Parent SPE-1028 remains open after this bounded child ships.
