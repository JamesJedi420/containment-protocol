# SPE-2759 — Explicit dependent prerequisite activation

| Field               | Value                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2759](https://linear.app/spectranoir/issue/SPE-2759/explicit-dependent-prerequisite-activation)     |
| **Status**          | **Shipped**                                                                                              |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) |
| **Branch**          | `agent/spe-2759-dependent-prerequisite-activation`                                                       |
| **Base `main` SHA** | `a7242d4c`                                                                                               |

## Goal

Explicitly activate one case-owned successor processing order after all of its
declared prerequisite workshop orders have canonical completion proof.

## Acceptance

- A pure domain write and narrow store action validate every declared
  prerequisite by work-order, case, department, task, and completed receipt.
- Successful activation reuses the atomic reservation/enqueue seam, deducts
  inventory once, and queues exactly one successor.
- Active, queued, paused, orphaned, and otherwise unproven same-case work still
  blocks; only canonically completed work outside all lanes is exempt.
- Missing, mismatched, stale, or cross-case proof fails closed without mutation.
- Replay and save/load preserve dependency validation and idempotency.

## Deferred

| Item                                 | Owner              | Why deferred                                          |
| ------------------------------------ | ------------------ | ----------------------------------------------------- |
| Automatic successor activation       | SPE-1028 follow-up | Activation remains an explicit caller action.         |
| Failure/cancellation release         | SPE-1028 follow-up | Requires a separate reservation lifecycle.            |
| Final production and case resolution | SPE-1028 follow-up | Outside prerequisite workshop progression.            |
| Global Fabrication and UI            | SPE-1028 follow-up | This slice remains case-scoped and domain/store only. |
