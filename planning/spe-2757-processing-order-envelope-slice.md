# SPE-2757 — Case-scoped prerequisite processing-order envelope

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2757](https://linear.app/spectranoir/issue/SPE-2757/case-scoped-prerequisite-processing-order-envelope) |
| **Status** | **Shipped** |
| **Parent** | [SPE-2703](https://linear.app/spectranoir/issue/SPE-2703/automatic-prerequisite-processing-orders) |
| **Branch** | `agent/spe-2757-processing-order-envelope` |
| **Base `main` SHA** | `8c6dd03a` |

## Goal

Persist fail-closed, case-owned prerequisite-processing envelopes from planned
SPE-2703 drafts without creating workshop work or changing inventory.

## Acceptance

- Valid case-owned envelopes save/load and reset correctly.
- Hydration rejects malformed, unsafe, mismatched, closed-case, duplicate, or
  cyclic dependency records without mutating valid input.
- Planner adaptation is deterministic, immutable, and preserves declared
  prerequisite order within a real open case.
- No inventory reservation, workshop enqueue/completion, case/global queue, or
  UI behavior changes.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Reservation and workshop enqueue | SPE-2703 follow-up | Envelopes are data only. |
| Completion output and dependency lifecycle | SPE-2703 follow-up | Requires explicit week-close and inventory ownership. |
| Global Fabrication or UI | SPE-2703 follow-up | Case ownership remains mandatory in this slice. |
