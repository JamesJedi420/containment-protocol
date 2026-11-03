# SPE-75 — Runtime publish executor / CI wiring (slice 1)

One-page implementation plan. Linear: [SPE-2484](https://linear.app/spectranoir/issue/SPE-2484) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2483](https://linear.app/spectranoir/issue/SPE-2483) per `planning/publish-queue-persistence-slice-1.md` § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2484 — Runtime publish executor / CI wiring (slice 1)](https://linear.app/spectranoir/issue/SPE-2484) |
| **Status** | **Shipped** — PR #2888 @ `6399251c` |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-publish-queue-executor-slice-1` |
| **Base `main` SHA** | `fd91fd3b` |

## Goal

Pure domain publish-queue dry-run executor consuming persisted `publishQueueRecords` and SPE-2480 hook descriptors with deterministic status transitions — no actual CI/GitHub API calls, UI, or SPE-75 parent reopen.

## Prerequisite (on `main` @ `fd91fd3b`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Publish-intent + queue persistence | `src/domain/publishAutomationCreditingHooks.ts` (SPE-2480 / SPE-2483) |
| Registry orchestration pattern | `src/domain/truthLayerWeeklyOrchestration.ts` (SPE-1343 slice 3) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publishQueueExecutor.ts` dry-run / channel-stub executor | Real CI/GitHub API integration |
| `ready_to_publish` → `published` status transition | Route/UI changes |
| Reject non-ready queue entries; idempotent re-execution | Mission triage (blocked) |
| Batch + weekly tick stub (`applyWeeklyPublishQueueExecutionTick`) | SPE-947 / SPE-1046 parent changes |
| Executor unit tests + canonical fixture chain | Modifiable-pack import wiring (separate child) |
| `withPublishQueueRecordStatus` helper + `published` status union | GameState execution-receipt persistence |

## Acceptance

- [x] Canonical fixture chain executes with stable hook stubs and `published` transition
- [x] Non-ready records rejected/skipped without mutation
- [x] Re-execution byte-identical for published records
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishQueueExecutor.ts`, `src/domain/publishAutomationCreditingHooks.ts` |
| Tests  | `src/test/publishQueueExecutor.test.ts` |
| Plan   | `planning/publish-queue-executor-slice-1.md`, `planning/backlog.md` |
| Docs   | optional cross-ref in `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Real CI/GitHub API wiring | [SPE-2488](https://linear.app/spectranoir/issue/SPE-2488) | Shipped in follow-up slice 1 (`pr-merge` channel) |
| Publish-queue UI / weekly orchestration surfacing | SPE-75 follow-up child | Executor must land before UI |
| GameState execution-receipt persistence | SPE-75 follow-up child | Optional ledger beyond queue status transition |

## See also

- `planning/publish-queue-persistence-slice-1.md`
- `planning/publish-automation-crediting-hooks-slice-1.md`
- `planning/backlog.md`
