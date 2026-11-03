# SPE-75 — GameState publish-queue execution-receipt persistence (slice 1)

One-page implementation plan. Linear: [SPE-2495](https://linear.app/spectranoir/issue/SPE-2495) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Natural deferred tail from [SPE-2485](https://linear.app/spectranoir/issue/SPE-2485) / contribution-release ops.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2495 — GameState publish-queue execution-receipt persistence (slice 1)](https://linear.app/spectranoir/issue/SPE-2495) |
| **Status** | **Shipped** — PR #2910 @ `c3521010` |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-publish-queue-execution-receipt-persistence-slice-1` |
| **Base `main` SHA** | `b3a02c3a` |

## Goal

Persist bounded publish-queue execution receipts on `GameState` with compose/sanitize/hydration — completes the publish-queue chain deferred from SPE-2485. No executor/GitHub client changes, no modifiable-pack weekly tick changes, no SPE-75 parent reopen.

## Prerequisite (on `main` @ `b3a02c3a`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Publish-queue persistence | `publishQueueRecords` on `GameState` (SPE-2483 / PR #2886) |
| Dry-run + live executor | `src/domain/publishQueueExecutor.ts` (SPE-2484 / SPE-2488) |
| Weekly orchestration | `applyWeeklyPublishQueueExecutionTickOrchestrated` in `advanceWeek` (SPE-2485 / SPE-2491) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publishQueueExecutionReceipts` on `GameState` | Executor / GitHub client changes |
| `publishQueueExecutionReceiptPersistence.ts` compose/sanitize/merge | Mirror UI / route changes |
| `runTransfer` hydrate + `startingState` default `{}` | Mission triage chips (blocked) |
| `advanceWeek` merge of reportable tick receipts | SPE-75 parent reopen |
| Domain unit tests + save/import round-trip + integration extension | Modifiable-pack integration (SPE-2494) |
| Slice doc (this file) + backlog handoff | Additional publish channels |

## Persistence contract

- **Map key** — `${recordId}@${executionWeek}`; one receipt per record per week.
- **Bounded ledger** — cap at `MAX_PUBLISH_QUEUE_EXECUTION_RECEIPTS` (64); drop oldest by `(executionWeek, recordId)` on overflow.
- **Compose** — validate executor receipt shape; return frozen receipt or `null`.
- **Sanitize** — drop malformed entries, key/id/week mismatch, duplicates, orphans (when `knownRecordIds` supplied); deterministic key sort on hydrate.
- **Merge** — persist only `isReportablePublishQueueReceipt` receipts aligned with post-tick queue record status (`completed` → `published`).
- **Empty map** — `{}` default; no throw on empty or all-invalid input.

## Acceptance

- [x] Valid executor receipt round-trips through compose → serialize → hydrate
- [x] Invalid/malformed/duplicate/orphan entries drop safely on sanitize
- [x] `advanceWeek` persists reportable receipts after weekly tick without executor changes
- [x] Receipt status aligned with post-tick queue record status
- [x] Empty map default; deterministic key ordering on hydrate
- [ ] `npm run lint` + targeted tests green (CI gate)

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishQueueExecutionReceiptPersistence.ts`, `src/domain/models.ts`, `src/domain/sim/advanceWeek.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/publishQueueExecutionReceiptPersistence.test.ts`, `src/test/advanceWeek.publishQueue.integration.test.ts` |
| Plan   | `planning/publish-queue-execution-receipt-persistence-slice-1.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Additional publish channels beyond `pr-merge` | Backlog child | Out of receipt-persistence boundary |
| Mirror surfacing over persisted receipts | [SPE-2496](https://linear.app/spectranoir/issue/SPE-2496) | Shipped to follow-up slice after persistence |
| Mission triage publish-queue / modifiable-pack chips | Backlog | Mission triage full refresh blocked |

## See also

- `planning/publish-queue-persistence-slice-1.md`
- `planning/publish-queue-surfacing-slice-1.md`
- `planning/publish-queue-live-orchestration-slice-1.md`
- `planning/backlog.md`
