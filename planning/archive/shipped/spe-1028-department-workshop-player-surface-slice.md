# SPE-1028 child — Player-facing authoritative department workshop surface

| Field               | Value                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2773](https://linear.app/spectranoir/issue/SPE-2773/player-facing-authoritative-department-workshop-surface)                   |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                           |
| **Status**          | **Shipped**                                                                                                                        |
| **Branch**          | `agent/spe-2773-department-workshop-player-surface`                                                                                |
| **Base `main` SHA** | `b8ce2c7666067761793c0d244f9aa4a824641a94`                                                                                         |

## Goal

Give the player an authoritative read-only presentation surface over durable
department workshop state so they can inspect slots, queued work, blockers,
quality/safety qualifications on completion receipts, and completion
consequences (including unsafe secondary-incident markers).

## Current behavior

- Durable registries exist on `GameState` (SPE-2747+): work orders, snapshots,
  completion outcomes, unsafe secondary-incident markers.
- SPE-2084 workload projection exists but is coordination-only (no UI).
- No player/ops route presents workshop lanes, blockers, or receipt ledger.

## Boundary

### In scope

- Domain surfacing labels + blocker codes from snapshot capacity/lanes only
- Feature projection over durable workshop registries
- Route + page + Front Desk quick link (publish-queue mirror pattern)
- Targeted view/page tests; workshop audit + backlog handoff updates

### Out of scope

- Week-close, enqueue, pause/resume, or inventory mutation
- Live facility/staff → safety/quality wiring ([SPE-2772](https://linear.app/spectranoir/issue/SPE-2772))
- Adjacency, centralization/distribution, SPE-2084 duration policy
- Re-grading quality/safety (display receipt-stored values only)

## Acceptance criteria

- [x] Front Desk link opens workshop surface
- [x] Per-department slot capacity, free slots, active/queued/paused with progress
- [x] Blockers: `zero_slot_capacity`, `slots_full`, `waiting_resume_slot`
- [x] Completion ledger shows stored quality/safety (+ reasons)
- [x] Unsafe secondary-incident markers join as consequences
- [x] Empty registries → explicit empty state
- [x] Targeted tests: empty, ordering, blockers, receipts, consequences, immutability
- [x] Docs: slice + audit + backlog handoff updated

## Shipped

PR https://github.com/JamesJedi420/containment-protocol/pull/3423 @ `bc3c1e40`.

## Deferred

| Item                                      | Owner              | Why deferred                                      |
| ----------------------------------------- | ------------------ | ------------------------------------------------- |
| Live facility/staff → safety inputs       | SPE-2772           | Mapping seam blocked                              |
| Live quality inputs                       | SPE-1028 follow-up | Separate from surface                             |
| Adjacency / centralization–distribution   | SPE-1028 follow-up | Facility topology                                 |
| Mutations / enqueue UI                    | Existing owners    | Read-only surface                                 |

Parent SPE-1028 returns to **Backlog** (no active bounded implementation child).
