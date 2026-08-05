# SPE-2703 — Prerequisite processing planner kernel

| Field               | Value                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2703](https://linear.app/spectranoir/issue/SPE-2703/automatic-prerequisite-processing-orders)       |
| **Status**          | **Shipped**                                                                                              |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) |
| **Branch**          | `agent/spe-2703-prerequisite-planner-kernel`                                                             |
| **Base `main` SHA** | `1885ddd0`                                                                                               |

## Goal

Plan deterministic prerequisite-processing drafts for a requested final recipe,
allocating existing material stock before recursively selecting authored
intermediate processing definitions.

## Ownership and boundary

- `planPrerequisiteProcessing` owns validation, stock-allocation accounting,
  post-order dependency traversal, batch calculation, and explicit failures.
- Its output is a pure draft: it writes no `GameState`, does not reserve or
  mutate inventory, and does not enqueue workshop or production orders.
- A final recipe receives stable prerequisite work-order IDs through
  `finalDependsOnWorkOrderIds`; each prerequisite carries only its direct
  prerequisite IDs.
- Missing, ambiguous, malformed, and cyclic processing definitions fail closed
  before any partial plan is returned.

## Acceptance

- [x] Existing stock is allocated before processing drafts are generated.
- [x] Authored prerequisite recipes traverse in deterministic post-order and
      calculate complete batches without instant conversion.
- [x] The final draft and intermediate drafts expose stable dependency IDs.
- [x] Missing, ambiguous, cyclic, and malformed inputs return explicit,
      immutable blocked results.
- [x] Replay is deterministic and caller-owned inventory is not mutated.

## Validation

- `npm run test:run -- src/test/prerequisiteProcessing.test.ts`
- `npm run lint -- --quiet`
- `npx prettier --check src/domain/prerequisiteProcessing.ts src/test/prerequisiteProcessing.test.ts planning/spe-2703-prerequisite-planner-kernel-slice.md planning/backlog.md planning/backlog-handoff-manifest.json docs/department-workshop-queue-audit.md`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`

## Deferred

| Item                                                                                   | Suggested owner    | Why deferred                                                                                                    |
| -------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| Atomic inventory reservation and workshop enqueue                                      | SPE-2703 follow-up | The planner returns only drafts; reservation and writes need one explicit transaction boundary.                 |
| Facility, staffing, safety, authorization, and quality validation                      | SPE-2703 follow-up | Existing workshop eligibility/queue rules must remain the sole writer-time authority.                           |
| Cancellation/failure propagation and duplicate-chain detection across persisted orders | SPE-2703 follow-up | These require durable dependency and lifecycle state, which this pure planner intentionally does not introduce. |
| Production/fabrication UI surfacing                                                    | SPE-2703 follow-up | The kernel has no store or UI integration.                                                                      |

Parent SPE-1028 remains open because its broader workshop acceptance criteria
and the deferred SPE-2703 integration remain open.
