# SPE-1028 child — Secondary incident spawn from unsafe workshop receipt

| Field               | Value                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | Pending create under [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) (Linear MCP unavailable at slice start) |
| **GitHub**          | [#3414](https://github.com/JamesJedi420/containment-protocol/issues/3414)                                                     |
| **Status**          | **Shipped** (PR #3415 @ `45f86baa`)                                                                                           |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                      |
| **Branch**          | `agent/spe-1028-workshop-unsafe-secondary-incident`                                                                           |
| **Base `main` SHA** | `30e53c03`                                                                                                                    |

## Goal

Consume durable `safety: 'unsafe'` workshop completion receipts at week-close
into the existing case-spawn path, opening one parent-linked secondary incident
per unsafe work order with a durable consume marker for replay idempotency.

## Acceptance

- Unsafe receipts spawn exactly one follow-up case via `instantiateFromTemplate`
  (parent `onUnresolved` template pool, else `onFail`); `parentCaseId` and
  trigger `workshop_unsafe` are recorded on the spawn record.
- Safe receipts spawn nothing.
- Quality `degraded` without `safety: 'unsafe'` spawns nothing.
- A work-order-keyed `departmentWorkshopUnsafeSecondaryIncidents` marker makes
  week-close replay and save/load a no-op. The `gameOver` early path stays
  handoffs-only and does not open new secondary incidents.
- Provenance mismatch, missing parent, or empty template pool fail closed
  without writing a marker.
- No changes to SPE-2765–2768, SPE-2762 terminals, adjacency, UI, live
  facility→safety inputs, pressure/`majorIncidentOperations`, or
  `applySpawnRule` parent mutation.

## Ownership and ordering

- Receipt registration remains the disposition owner (SPE-2754 / safety child).
- This slice owns the week-close consumer immediately after
  `registerDepartmentWorkshopCompletionOutcomes` and before prereq/handoff
  reconcilers.
- Idempotency boundary is the durable spawn-marker registry, not receipt rewrite.

## Validation

- `npx vitest run src/test/departmentWorkshopPersistence.test.ts src/test/departmentWorkshopUnsafeIncident.test.ts`
- `npm run lint -- --quiet`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                  | Owner              | Why deferred                                              |
| ------------------------------------- | ------------------ | --------------------------------------------------------- |
| Live facility/staff → safety inputs   | `planning/spe-1028-workshop-live-safety-inputs-slice.md` (Backlog; mapping seam required) | Week-close still omits register conditions → safe; no live projection until a mapping seam exists. |
| Live facility/staff → quality inputs  | SPE-1028 follow-up | Still deferred from SPE-2768.                             |
| Same-tick `case.spawned` report notes | SPE-1028 follow-up | Late workshop seam runs after `finalizeEvents`.           |
| Adjacency and player workshop surface | SPE-1028 follow-up | Still outside completion-receipt / spawn-marker ownership.|

Parent SPE-1028 remains **In Progress** because its broader workshop acceptance
criteria remain open.
