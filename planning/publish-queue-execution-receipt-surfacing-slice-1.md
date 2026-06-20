# SPE-75 — Publish-queue execution-receipt mirror surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2496](https://linear.app/spectranoir/issue/SPE-2496) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2495](https://linear.app/spectranoir/issue/SPE-2495) per `planning/publish-queue-execution-receipt-persistence-slice-1.md` § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2496 — Publish-queue execution-receipt mirror surfacing (slice 1)](https://linear.app/spectranoir/issue/SPE-2496) |
| **Status** | **In Progress** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-publish-queue-execution-receipt-surfacing-slice-1` |
| **Base `main` SHA** | `c3521010` |

## Goal

Surface hydrated `publishQueueExecutionReceipts` on the existing `/publish-queue` planning mirror — read-only ledger with summary counts and joined record labels. No executor/GitHub changes, no persistence changes, no mission triage, no SPE-75 parent reopen.

## Prerequisite (on `main` @ `c3521010`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Execution-receipt persistence | `publishQueueExecutionReceipts` on `GameState` (SPE-2495 / PR #2910) |
| Publish-queue mirror | `publishQueueMirrorView.ts` + `/publish-queue` route (SPE-2485) |
| Label helpers | `formatPublishQueueExecutorOutcomeLabel`, `resolvePublishQueueReceiptExecutionMode`, `formatPublishQueueSkipCodeLabel` in `publishQueueSurfacing.ts` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `summarizePublishQueueExecutionReceipts` in `publishQueueSurfacing.ts` | Executor / GitHub client changes |
| Receipt row projection + sort in `publishQueueMirrorView.ts` | Receipt persistence compose/sanitize/merge |
| Receipts section on `PublishQueueMirrorPage.tsx` + copy | New routes |
| Mirror view + page smoke tests | Mission triage chips (blocked) |
| Slice doc (this file) + backlog handoff | SPE-75 parent reopen |
| Docs cross-ref in `contribution-and-release-operations.md` | Additional publish channels |

## Surfacing contract

- **Read-only ledger** — display hydrated `publishQueueExecutionReceipts` map entries only; no re-sanitize or orphan re-validation.
- **Record join** — `publishQueueRecords[recordId]?.label ?? recordId` for display labels.
- **Empty map** — empty receipts section, no throw.
- **Live vs dry-run** — `publishChannelRef` presence discriminates execution mode.
- **Deterministic sort** — `(executionWeek desc, recordId asc)` for ledger display.
- **Independent sections** — record `isEmpty` semantics unchanged; receipts use separate `receiptsEmpty` flag.

## Acceptance

- [ ] Empty receipt map renders empty receipts section without throw
- [ ] Completed dry-run and live receipts show correct outcome/mode/channel labels
- [ ] Rejected and reportable skipped receipts surface in ledger
- [ ] Orphan receipt (no matching queue record) shows recordId fallback label
- [ ] Existing queue-record mirror tests unchanged
- [ ] `npm run lint` + targeted tests green (CI gate)

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishQueueSurfacing.ts`                                 |
| View   | `src/features/operations/publishQueueMirrorView.ts`                 |
| UI     | `src/features/operations/PublishQueueMirrorPage.tsx`                |
| Desk   | `src/features/operations/frontDeskView.ts` (optional description)    |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/publishQueueSurfacing.test.ts`, `src/features/operations/publishQueueMirrorView.test.ts`, `src/features/operations/PublishQueueMirrorPage.test.tsx` |
| Plan   | `planning/publish-queue-execution-receipt-surfacing-slice-1.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md`                         |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Additional publish channels beyond `pr-merge` | Backlog child | Out of mirror surfacing boundary |
| Mission triage publish-queue / modifiable-pack chips | Backlog | Mission triage full refresh blocked |

## See also

- `planning/publish-queue-execution-receipt-persistence-slice-1.md`
- `planning/publish-queue-surfacing-slice-1.md`
- `planning/backlog.md`
