# SPE-1028 department workshop queue/slot kernel slice

| Field           | Value                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **Linear**      | [SPE-2745](https://linear.app/spectranoir/issue/SPE-2745/spe-1028-department-workshop-queueslot-kernel)  |
| **Parent**      | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) |
| **Status**      | **Shipped**                                                                                              |
| **Branch**      | `agent/spe-2745-department-workshop-queue-kernel`                                                        |
| **Base commit** | `0382c98f7ccaa2c98236e3e3dfd8e939d5eaa0e9`                                                               |

## Goal

Add the first bounded SPE-1028 implementation slice: a pure deterministic
department workshop kernel that consumes caller-owned work orders and snapshots,
models ordered queued/active/paused work under bounded slots, and projects a
validated workload view for SPE-2084.

## Current behavior

- SPE-2083 owns authored department capabilities, task types, and case ownership.
- SPE-2084 consumes caller-provided ordered case IDs and weekly capacity, but it
  does not own or advance a workshop queue.
- `src/domain/sim/queue.ts` mutates only the global `GameState.caseQueue`.
- `src/domain/facility.ts` owns aggregate facility upgrade/effect math.
- `advanceWeek` advances existing logistics queues before construction and other
  downstream hooks.

No department workshop work-order or slot contract exists on the base commit.

## Boundary

### In scope

- Caller-owned work orders with department, case, task type, and required-work
  identity.
- Caller-owned workshop snapshots with ordered queued, active, and paused work.
- Dense-array, unique-membership, department/task, slot, and progress validation.
- One pure processing tick:
  - fill open slots from authored queue order
  - advance every active work item by one unit
  - complete items at their required-work threshold
  - backfill freed slots without advancing replacements until the next tick
- Explicit pause/resume transitions that preserve progress.
- Immutable/fail-closed transition results.
- A projection of active occupancy followed by queued work into SPE-2084's
  `DepartmentWorkloadSnapshot`; paused work is excluded.

### Out of scope

- `GameState`, persistence, hydration, schema, store, or event changes.
- Week-close hooks or ordering changes.
- Global case-queue mutation or priority semantics.
- UI or player-facing copy.
- Facility adjacency, travel time, room topology, or centralized/distributed
  workshop policy.
- Input/output quality, equipment, reagent, specialist-condition, or clutter math.
- Safety requirements, incidents, contamination, and authorization.
- Research progression, crafting, fabrication inventory, or upgrade behavior.
- SPE-2088 authorization and SPE-95 coordination friction.

## Contracts

### Work order

`DepartmentWorkshopWorkOrder` contains:

- normalized unique `id`
- authored `departmentId`
- normalized `caseId`
- SPE-2083 `taskType`
- positive integer `requiredWork`

### Snapshot

`DepartmentWorkshopSnapshot` contains:

- one authored `departmentId`
- non-negative integer `slotCapacity`
- ordered dense `queued`, `active`, and `paused` work-item arrays
- each work item contains a work-order ID and non-negative integer progress

A work order may appear in exactly one snapshot lane. Referenced work must target
the snapshot department, use a supported task type, and have progress below its
completion threshold. Active work cannot exceed slot capacity.

### SPE-2084 projection

The projection emits active case IDs first because active work occupies the
current capacity batch, then queued case IDs in authored order. `slotCapacity`
becomes SPE-2084 `weeklyCapacity`. Paused work does not consume a slot and is
excluded. Duplicate case IDs fail closed rather than silently undercounting delay.
Zero slot capacity projects as zero so SPE-2084 retains ownership of its
canonical `zero-department-capacity` blocked outcome.

This projection is a bounded current-occupancy compatibility view. Remaining
multi-tick work duration does not rewrite SPE-2084's existing weekly-capacity
formula; a later integration child must define duration-aware coordination
throughput before making that delay authoritative.

This is a read contract only. SPE-2084 remains the coordination evaluator and
does not acquire queue mutation or persistence ownership.

## Determinism

- Queue, active-slot, and paused ordering is caller-authored and preserved.
- Work-order definition input order has no semantic weight.
- Reason work-order IDs use code-unit order.
- No RNG, clock, locale sort, or hidden state is read.
- Inputs and nested collections are never mutated.

## Acceptance

- [x] Slot contention bounds active work and preserves authored queue order.
- [x] Advancement and equal-input replay are deterministic.
- [x] Pausing frees a slot and resuming preserves prior progress.
- [x] Zero capacity blocks advancement without discarding a valid snapshot.
- [x] Duplicate definitions/membership, overlap, sparse arrays, missing work,
      missing departments, unsupported tasks, invalid progress, and slot overflow
      fail closed.
- [x] Results and nested output collections are immutable.
- [x] The SPE-2084 projection preserves active/queued occupancy and excludes
      paused work.
- [x] Duplicate projected case IDs fail closed.
- [x] No global queue, facility state, `advanceWeek`, SPE-2088, or SPE-95 mutation
      is introduced.

## Expected files

- `src/domain/departmentWorkshopQueue.ts`
- `src/domain/departmentCoordination.ts`
- `src/test/departmentWorkshopQueue.test.ts`
- `planning/spe-1028-department-workshop-queue-kernel-slice.md`
- `planning/spe-2084-cross-department-coordination-slice.md`
- `docs/department-workshop-queue-audit.md`
- `docs/design-audits-index.md`
- `docs/mission-intake-triage-routing-audit.md`
- `planning/backlog.md`
- `planning/backlog-handoff-manifest.json`

## Validation

- Focused SPE-2745 queue/slot tests
- SPE-2084 evaluator and mission-intake integration tests
- Existing global queue, facility, SPE-2088, and SPE-95 tests
- Boundary enforcement
- `npm run lint`
- `npm run test:run`
- `npm run format:check`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`

## Deferred

| Item                                      | Suggested owner       | Why deferred                                                                                            |
| ----------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------- |
| Durable workshop state and hydration      | Future SPE-1028 child | Requires explicit schema, normalization, save migration, and store ownership.                           |
| Week-close workshop advancement           | Future SPE-1028 child | Must integrate only after durable ownership and ordering are specified.                                 |
| Duration-aware coordination throughput    | Future SPE-1028 child | SPE-2745 projects current occupancy only; SPE-2084 retains its existing coarse weekly-capacity formula. |
| Room adjacency and travel effects         | Future SPE-1028 child | Depends on facility topology rather than queue invariants.                                              |
| Output quality and specialist/equipment   | Future SPE-1028 child | Adds independent inputs and reliability policy.                                                         |
| Safety rules and secondary incidents      | Future SPE-1028 child | Requires incident ownership and authorization contracts.                                                |
| Centralized/distributed workshop tradeoff | Future SPE-1028 child | Depends on layout, staffing, and breach-isolation models.                                               |
| Player-facing workshop surface            | Future SPE-1028 child | Requires durable state and a projection/UI boundary.                                                    |

Parent SPE-1028 remains Backlog after this slice because its adjacency, quality,
safety, centralization, dependency, upgrade, and visible-planning acceptance
criteria remain open.
