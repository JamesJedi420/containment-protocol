# SPE-2763 — Canonical case-cancellation command

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2763](https://linear.app/spectranoir/issue/SPE-2763/canonical-case-cancellation-command-and-lifecycle-producer-integration) |
| **Status**          | **Shipped**                                                                                                                      |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                         |
| **Branch**          | `agent/spe-2763-canonical-case-cancellation-command`                                                                             |
| **Base `main` SHA** | `2f253d5a`                                                                                                                       |

## Goal

Add an explicit canonical case-cancellation command that supplies the existing
`cancelled` lifecycle disposition without inferring cancellation from case
status, lifecycle stage, assignment, deadline, reports, or week-close state.

## Acceptance

- The pure lifecycle command validates the authored target, fixes the
  disposition to `cancelled` at the canonical game week, and delegates terminal
  proof registration to the SPE-2762 producer.
- Invalid IDs, missing cases, and resolved cases are blocked without mutation.
- Identical replay is an accepted no-op. Completed or conflicting proof remains
  first-write-wins, and malformed provenance is isolated per work order.
- The store persists only newly registered terminal signals and does not mutate
  cases, workshop lanes, reservations, inventory, operation events, or global
  queues.
- Week close retains workshop completion → prerequisite completion/output →
  terminal release → successor activation ordering, so completion wins
  cancellation races.
- Cancellation proof survives save/load without a persistence, save-version,
  lifecycle-stage, or operation-event schema change.

## Validation

- `npx vitest run src/test/caseLifecycleWeeklyOrchestration.test.ts src/app/store/gameStore.caseCancellation.test.ts src/test/sim.advanceWeek.test.ts src/test/prerequisiteProcessingOrders.test.ts src/test/departmentWorkshopPersistence.test.ts`
- `npm run lint`
- `npm run format:check`
- `npm run verify:backlog-handoff`
- `npm run test:run`

## Deferred

| Item                            | Owner              | Why deferred                                                                  |
| ------------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| Workshop lane and order cleanup | SPE-1028 follow-up | This command owns terminal proof only; cleanup requires a separate lifecycle. |
| Final fabrication/case closure  | SPE-1028 follow-up | Those lifecycles remain outside prerequisite reservation accounting.          |
| Global Fabrication and UI       | SPE-1028 follow-up | This slice changes only pure domain and the existing store command surface.   |

Parent SPE-1028 remains open for broader scope. because its broader workshop acceptance
criteria remain open.
