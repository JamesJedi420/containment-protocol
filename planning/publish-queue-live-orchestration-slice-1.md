# SPE-75 — Publish-queue live advanceWeek orchestration (slice 1)

One-page implementation plan. Linear: [SPE-2491](https://linear.app/spectranoir/issue/SPE-2491) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2488](https://linear.app/spectranoir/issue/SPE-2488) per `planning/publish-queue-github-api-slice-1.md` § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2491 — Publish-queue live advanceWeek orchestration (slice 1)](https://linear.app/spectranoir/issue/SPE-2491) |
| **Status** | In progress — PR pending |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-publish-queue-live-orchestration-slice-1` |
| **Base `main` SHA** | `2e655e18` |

## Goal

Wire weekly publish-queue execution in `advanceWeek` to invoke the live `pr-merge` executor path when explicitly configured (`PUBLISH_QUEUE_EXECUTOR_MODE=live` + GitHub credentials + injectable sync client). Surface live execution receipts in weekly notes. Dry-run remains the safe default for browser and CI tests.

## Prerequisite (on `main` @ `2e655e18`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Dry-run executor | `src/domain/publishQueueExecutor.ts` (SPE-2484 / PR #2888) |
| Weekly surfacing | `applyWeeklyPublishQueueExecutionTick` in `advanceWeek` (SPE-2485 / PR #2890) |
| GitHub API client | `src/domain/publishQueueGitHubClient.ts` (SPE-2488 / PR #2896) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publishQueueWeeklyOrchestration.ts` live vs dry-run branch | SPE-75 parent reopen |
| `advanceWeek` orchestrated tick + optional deps param | Mission triage (blocked) |
| Live receipt labels in weekly notes + metadata | Modifiable-pack import |
| Sync live batch executor for weekly loop | Additional publish channels |
| Unit + `advanceWeek` integration tests | GameState execution-receipt persistence map |

## Orchestration contract

| Input | Behavior |
| --- | --- |
| Default / browser / CI tests | `dry-run` — existing SPE-2484 stubs |
| `PUBLISH_QUEUE_EXECUTOR_MODE=live` without full credentials | `dry-run` fallback |
| Live mode + credentials + `githubClient` in deps | Sync `pr-merge` live path |
| Live mode + credentials without sync client | `dry-run` fallback (`advanceWeek` is synchronous) |
| Failed API merge | Reject receipt; record byte-stable |
| Empty queue | No-op; zero notes |
| Idempotent re-tick | `already_published` skip; no duplicate notes |

## Acceptance

- [x] Default / CI tests remain dry-run
- [x] Live path transitions `ready_to_publish` → `published` with `publishChannelRef` when deps inject sync client
- [x] Failed live API calls do not mutate queue records
- [x] Weekly notes distinguish live vs dry-run (`executionMode` metadata)
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishQueueWeeklyOrchestration.ts`, `src/domain/publishQueueExecutor.ts`, `src/domain/publishQueueSurfacing.ts`, `src/domain/publishQueueWeeklyReportNotes.ts`, `src/domain/publishQueueGitHubClient.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/publishQueueWeeklyOrchestration.test.ts`, `src/test/advanceWeek.publishQueue.integration.test.ts`, `src/test/publishQueueSurfacing.test.ts`, `src/test/publishQueueWeeklyReportNotes.test.ts` |
| Plan   | `planning/publish-queue-live-orchestration-slice-1.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Additional publish channels | SPE-75 follow-up child | Slice 1 wires `pr-merge` only |
| GameState execution-receipt persistence | SPE-75 follow-up child | Optional ledger beyond queue status transition |
| Async live batch outside sync `advanceWeek` | Ops harness | Use `executePublishQueueRecordsLive` for non-weekly automation |
| Mission triage publish-queue chips | Backlog | Mission triage full refresh blocked |

## See also

- `planning/publish-queue-github-api-slice-1.md`
- `planning/publish-queue-surfacing-slice-1.md`
- `planning/publish-queue-executor-slice-1.md`
- `planning/backlog.md`
