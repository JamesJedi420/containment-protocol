# SPE-2755 — Consume workshop completion receipts in case records

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2755](https://linear.app/spectranoir/issue/SPE-2755/consume-workshop-completion-receipts-in-case-records) |
| **Status**          | **Shipped**                                                                                                    |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)       |
| **Branch**          | `agent/spe-2755-workshop-receipt-case-consumer`                                                                |
| **Base `main` SHA** | `df1e3edd`                                                                                                     |

## Goal

Apply durable workshop completion receipts to their authored case record only.

## Ownership and ordering

- SPE-2745 detects completion, SPE-2747 owns durable workshop registries, and
  SPE-2753 remains the sole workshop-processing tick.
- SPE-2754 owns receipt registration immediately after that tick.
- SPE-2755 reads the sanitized receipt registry immediately afterwards and
  appends each receipt's work-order ID to the authored open case's
  `departmentWorkshopCompletionWorkOrderIds` ledger.
- The case-local ledger is the consumer idempotency boundary: repeated close,
  duplicate receipt, and save/load replay do not append a second ID.

## Acceptance

- [x] Only an existing, non-resolved authored case receives a receipt ID.
- [x] Receipt consumption is deterministic and does not mutate input state.
- [x] The case ledger and receipt registry survive save/load and replay once.
- [x] `GameState.caseQueue` and inventory remain unchanged.
- [x] No adjacency, quality, safety, facilities, UI, SPE-95, SPE-2088, or
      SPE-2703 behavior changes.

## Validation

- `npm run test:run -- src/test/departmentWorkshopPersistence.test.ts`
- `npm run lint -- --quiet`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`

## Deferred

| Item                                                             | Suggested owner       | Boundary                                                   |
| ---------------------------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| Receipt consumers for inventory, quality, safety, and facilities | Future SPE-1028 child | The case-record ledger is the only consumer in this slice. |

Parent SPE-1028 remains open for broader scope. because its broader acceptance criteria remain open.
