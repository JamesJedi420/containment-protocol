# SPE-2765 — Canonical workshop finalization handoff

| Field               | Value                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2765](https://linear.app/spectranoir/issue/SPE-2765/canonical-workshop-finalization-handoff)        |
| **Status**          | **Shipped**                                                                                              |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) |
| **Branch**          | `agent/spe-2765-canonical-workshop-finalization-handoff`                                                 |
| **Base `main` SHA** | `dd3f68ba`                                                                                               |

## Goal

Convert exact case-owned prerequisite workshop completion provenance into one
durable readiness handoff for an authored production recipe.

## Acceptance

- A normalized case request owns the final recipe and exact prerequisite
  work-order IDs; the planner adapter preserves that authored mapping.
- A pure reconciler verifies the case ledger, prerequisite envelope, durable
  workshop order, completion outcome, and production catalog contract before
  writing one case-local handoff.
- The handoff derives output identity and quantity from the catalog and derives
  its week from the newest required completion receipt.
- Week close runs the reconciler immediately after SPE-2755 receipt consumption,
  including game-over replay.
- Missing or malformed provenance, cross-case mappings, resolved cases, duplicate
  receipts, and save/load replay remain isolated and idempotent.
- Inventory receives prerequisite output once, but the final output and global
  Fabrication queue remain unchanged.

## Validation

- `npx vitest run src/test/prerequisiteProcessingOrders.test.ts src/test/departmentWorkshopPersistence.test.ts src/test/sim.advanceWeek.test.ts`
- `npm run lint -- --quiet`
- `npm run format:check`
- `npm run verify:backlog-handoff`
- `npm run test:run`

## Deferred

| Item                              | Owner              | Why deferred                                                                    |
| --------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| Final Fabrication                 | [SPE-2766](https://linear.app/spectranoir/issue/SPE-2766) | Consumes this handoff into global Fabrication enqueue.                      |
| Automatic case closure            | [SPE-2767](https://linear.app/spectranoir/issue/SPE-2767) | Resolves open cases after durable Fabrication enqueue proof.                |
| Global Fabrication and UI         | SPE-1028 follow-up | This slice changes only pure domain, case persistence, and week-close ordering. |
| Facility modifiers and operations | Separate owners    | No safety, adjacency, quality, facility, report, or operation-event changes.    |

Parent SPE-1028 remains open because its broader workshop acceptance
criteria remain open.
