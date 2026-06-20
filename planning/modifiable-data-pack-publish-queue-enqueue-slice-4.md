# SPE-75 — Modifiable data-pack publish queue enqueue weekly orchestration (slice 4)

One-page implementation plan. Linear: [SPE-2500](https://linear.app/spectranoir/issue/SPE-2500) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Closes deferred runtime wire-up from [SPE-2494](https://linear.app/spectranoir/issue/SPE-2494) slice doc § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2500 — Modifiable data-pack publish queue enqueue weekly orchestration (slice 4)](https://linear.app/spectranoir/issue/SPE-2500) |
| **Status** | **In progress** — branch `spe-75-modifiable-data-pack-publish-queue-enqueue-slice-4` |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-modifiable-data-pack-publish-queue-enqueue-slice-4` |
| **Base `main` SHA** | `40320cbf` |

## Goal

Wire persisted `applied` modifiable data-packs through SPE-2494 publish-intent integration into bounded `publishQueueRecords` during `advanceWeek`, then execute via existing publish-queue orchestration (SPE-2491). Reorder weekly ticks: governance → enqueue → execution.

## Prerequisite (on `main` @ `40320cbf`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Publish integration  | `src/domain/modifiableDataPackPublishIntegration.ts` (SPE-2494) |
| Governance tick      | `src/domain/modifiableDataPackWeeklyOrchestration.ts` (SPE-2493) |
| Publish-queue execution | `src/domain/publishQueueWeeklyOrchestration.ts` (SPE-2491) |
| Queue composition    | `composePublishQueueRecord` in `publishAutomationCreditingHooks.ts` (SPE-2480) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `modifiableDataPackPublishQueueEnqueue.ts` weekly enqueue tick | Mirror UI changes |
| `evaluateModifiableDataPackPublishIntegrationFromRecord` helper | New pack persistence fields |
| `advanceWeek` reorder: governance → enqueue → execution | Mission triage chips (blocked) |
| Enqueue weekly report notes + `ReportNoteType` registration | SPE-75 parent reopen |
| Unit + `advanceWeek` integration tests | Additional publish channels |
| Slice doc (this file) + backlog handoff | `runTransfer` import-path changes |

## Enqueue contract

| Input | Behavior |
| --- | --- |
| Empty pack map | No-op; zero receipts; no throw |
| `applied` + `ready_to_publish` integration | Enqueue `publish-queue:modifiable-pack:{packId}` |
| Queue record already present | Idempotent skip (`queue_record_exists`) |
| `needs_revision` / non-applied | Skip (`import_status_not_applied`) |
| Integration not ready | Reject receipt; no queue mutation |
| Same-week execution | Enqueue tick runs before publish-queue execution tick |

## Acceptance

- [x] Empty `modifiableDataPackRecords` enqueue tick no-op without throw
- [x] Applied canonical pack enqueues deterministic queue record on `advanceWeek`
- [x] Same-week dry-run execution publishes enqueued record
- [x] Idempotent re-tick skips duplicate enqueue; stable across weeks
- [x] `needs_revision` packs do not enqueue
- [x] `REPORT_NOTE_TYPES` + audit registry aligned
- [x] `npm run lint` + targeted tests green (CI)

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/modifiableDataPackPublishQueueEnqueue.ts`, `src/domain/modifiableDataPackPublishQueueEnqueueWeeklyReportNotes.ts`, `src/domain/modifiableDataPackPublishIntegration.ts`, `src/domain/modifiableDataPackValidation.ts`, `src/domain/modifiableDataPackSurfacing.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| View   | `src/features/report/reportNoteView.ts`                               |
| Tests  | `src/test/modifiableDataPackPublishQueueEnqueue.test.ts`, `src/test/modifiableDataPackPublishQueueEnqueueWeeklyReportNotes.test.ts`, `src/test/advanceWeek.modifiableDataPack.integration.test.ts`, `src/test/modifiableDataPackPublishIntegration.test.ts`, `src/test/reportNoteTypeAudit.test.ts` |
| Plan   | `planning/modifiable-data-pack-publish-queue-enqueue-slice-4.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mission triage modifiable-pack / publish-queue chips | Backlog | Mission triage full refresh blocked |
| Additional publish channels beyond pr-merge / manual-approval / webhook | SPE-75 follow-up | Out of slice boundary |
| `runTransfer` import-path enqueue | Out of slice | Pure domain + `advanceWeek` wire-up sufficient |

## See also

- `planning/modifiable-data-pack-publish-automation-integration-slice-3.md`
- `planning/modifiable-data-pack-weekly-orchestration-slice-2.md`
- `planning/publish-queue-live-orchestration-slice-1.md`
- `planning/backlog.md`
