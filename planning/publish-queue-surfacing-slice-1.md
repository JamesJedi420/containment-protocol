# SPE-75 — Publish-queue UI / orchestration surfacing (slice 1)

One-page implementation plan. Linear: [SPE-2485](https://linear.app/spectranoir/issue/SPE-2485) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2484](https://linear.app/spectranoir/issue/SPE-2484) per `planning/publish-queue-executor-slice-1.md` § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2485 — Publish-queue UI / orchestration surfacing (slice 1)](https://linear.app/spectranoir/issue/SPE-2485) |
| **Status** | **In progress** — branch `spe-75-publish-queue-surfacing-slice-1` |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-publish-queue-surfacing-slice-1` |
| **Base `main` SHA** | `dff81abe` |

## Goal

Surface persisted `publishQueueRecords` and dry-run execution receipts via read-only planning mirror and weekly report notes; wire `applyWeeklyPublishQueueExecutionTick` into `advanceWeek` — no real CI/GitHub API calls, mission triage, or SPE-75 parent reopen.

## Prerequisite (on `main` @ `dff81abe`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Publish-queue persistence | `publishQueueRecords` on `GameState` (SPE-2483 / PR #2886) |
| Dry-run executor | `src/domain/publishQueueExecutor.ts` (SPE-2484 / PR #2888) |
| Planning mirror template | `patternSourceSeriesMirrorView.ts` + `PatternSourceSeriesMirrorPage.tsx` (SPE-2110 slice 4) |
| Weekly note template | `informationIntakeExtranormalCrossLinkWeeklyReportNotes.ts` (SPE-2470) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publishQueueSurfacing.ts` projection helpers (CP-neutral labels) | Real CI/GitHub API integration |
| `applyWeeklyPublishQueueExecutionTick` in `advanceWeek` | Mission triage chips (blocked) |
| `publishQueueWeeklyReportNotes.ts` + `ReportNoteType` registration | GameState execution-receipt persistence map |
| Planning mirror page + route `/publish-queue` + Front Desk link | SPE-75 parent status change |
| Mirror + projection + `advanceWeek` integration tests | Modifiable-pack runtime import (SPE-2479 deferred) |
| Slice doc (this file) + backlog handoff | Re-validation on mirror (hydrated truth only) |

## Surfacing contract

- **Read-only mirror** — display hydrated `publishQueueRecords`; no mutations from mirror surface.
- **Weekly orchestration** — one deterministic dry-run tick per week when queue non-empty; mutates only queue record status via existing executor.
- **Safe labels** — record id, label, `releaseArtifactRef`, formatted status, dry-run stub prefixes; copy states simulation / dry-run channel.
- **Empty queue** — mirror `isEmpty: true`; tick no-op; zero weekly notes; no throw.
- **Status discrimination** — `ready_to_publish` vs `published` vs terminal (`needs_revision`, `rejected`) visible in mirror and notes.
- **Weekly notes** — emit when tick produces reportable receipts (completed or non-idempotent skip/reject); omit idempotent `already_published` skips.

## Acceptance

- [x] Empty `publishQueueRecords` renders mirror empty state without throw
- [x] `ready_to_publish` records transition to `published` on weekly tick (canonical fixture chain)
- [x] Weekly report note uses safe labels and new `contribution_release.publish_queue_execution` type
- [x] Mirror summary counts and per-record status labels discriminate published vs ready
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishQueueSurfacing.ts`, `src/domain/publishQueueWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| View   | `src/features/operations/publishQueueMirrorView.ts`                 |
| UI     | `src/features/operations/PublishQueueMirrorPage.tsx`                |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/test/publishQueueSurfacing.test.ts`, `src/test/publishQueueWeeklyReportNotes.test.ts`, `src/test/advanceWeek.publishQueue.integration.test.ts`, `src/features/operations/publishQueueMirrorView.test.ts`, `src/features/operations/PublishQueueMirrorPage.test.tsx`, `src/test/reportNoteTypeAudit.test.ts` |
| Plan   | `planning/publish-queue-surfacing-slice-1.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Real CI/GitHub API wiring | SPE-75 follow-up child | External automation beyond dry-run stubs |
| GameState execution-receipt persistence | SPE-75 follow-up child | Optional ledger beyond queue status transition |
| Modifiable data-pack runtime import | SPE-2479 follow-up child | Separate boundary from surfacing |
| Mission triage publish-queue chips | Backlog | Mission triage full refresh blocked |

## See also

- `planning/publish-queue-executor-slice-1.md`
- `planning/publish-queue-persistence-slice-1.md`
- `planning/pattern-source-series-registry-slice-4.md`
- `planning/information-intake-extranormal-cross-link-surfacing-slice-1.md`
- `planning/backlog.md`
