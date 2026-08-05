# SPE-2764 — Canonical terminal workshop lane cleanup

| Field               | Value                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2764](https://linear.app/spectranoir/issue/SPE-2764/canonical-terminal-workshop-lane-cleanup)       |
| **Status**          | **Shipped**                                                                                              |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) |
| **Branch**          | `agent/spe-2764-canonical-terminal-workshop-lane-cleanup`                                                |
| **Base `main` SHA** | `1d852810`                                                                                               |

## Goal

Remove canonically failed or cancelled prerequisite-processing work from active,
queued, and paused department workshop lanes after completion reconciliation
and exact terminal reservation release.

## Acceptance

- A pure workshop reconciler applies only caller-proven terminal work-order IDs
  to sanitized workshop state and removes matching membership from every lane.
- Durable work-order provenance remains intact for completion, activation, and
  replay guards.
- Week close runs cleanup after completion credit and terminal reservation
  release but before successor activation.
- Completion wins same-week terminal races because completed work is not
  eligible for reservation release or lane cleanup.
- Freed slots are not refilled mid-pass; the existing next workshop tick owns
  deterministic queue refill and advancement.
- Invalid terminal provenance, duplicate replay, and malformed siblings cannot
  clean unaffected work in the same or another case or department.
- Save/load replay is idempotent and does not duplicate refunds, cleanup, or
  advancement.

## Validation

- `npx vitest run src/test/departmentWorkshopPersistence.test.ts src/test/sim.advanceWeek.test.ts src/test/prerequisiteProcessingOrders.test.ts`
- `npm run lint`
- `npm run format:check`
- `npm run verify:backlog-handoff`
- `npm run test:run`

## Deferred

| Item                               | Owner              | Why deferred                                                                         |
| ---------------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| Durable provenance deletion        | SPE-1028 follow-up | Activation/replay guards still require retained work-order provenance.               |
| Final Fabrication and case closure | SPE-1028 follow-up | Those lifecycles remain outside prerequisite reservation and workshop-lane cleanup.  |
| Global Fabrication and UI          | SPE-1028 follow-up | This slice changes only pure workshop state and the existing week-close integration. |

Parent SPE-1028 remains open for broader scope. because its broader workshop acceptance
criteria remain open.
