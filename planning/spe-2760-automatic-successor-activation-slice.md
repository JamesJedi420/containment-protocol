# SPE-2760 — Automatic successor activation

| Field               | Value                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2760](https://linear.app/spectranoir/issue/SPE-2760/automatic-successor-activation)                 |
| **Status**          | **Shipped**                                                                                              |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) |
| **Branch**          | `agent/spe-2760-automatic-successor-activation`                                                          |
| **Base `main` SHA** | `5ce187e5`                                                                                               |

## Goal

At week close, deterministically activate at most one dependency-ready
case-scoped prerequisite-processing successor per case through the established
completion, activation, and atomic reservation/enqueue seams.

## Acceptance

- A pure registry reconciler selects one successor per case in stable case-ID
  then work-order-ID order, after canonical prerequisite completion proof.
- Week close reconciles completed prerequisite output before successor
  activation, so a just-completed prerequisite can fund its successor.
- Insufficient inventory or a failed activation leaves that candidate's state
  unchanged; other cases still reconcile independently.
- Reservation and completion receipts make replays and save/load idempotent;
  no duplicate inventory deduction or queue entry is created.
- No persistence schema, cancellation, final production, case resolution,
  global Fabrication, or UI behavior changes.

## Validation

- `npx vitest run src/test/prerequisiteProcessingOrders.test.ts src/test/dependentPrerequisiteActivation.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                     | Owner              | Why deferred                                                                  |
| ---------------------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| Failure/cancellation reservation release | SPE-1028 follow-up | Requires a separate lifecycle contract beyond completed-order reconciliation. |
| Final fabrication and case resolution    | SPE-1028 follow-up | This slice advances prerequisite workshops only.                              |
| Global Fabrication and UI                | SPE-1028 follow-up | The durable case-owned registry remains the sole integration surface.         |

Parent SPE-1028 remains open for broader scope. because its broader workshop acceptance
criteria remain open.
