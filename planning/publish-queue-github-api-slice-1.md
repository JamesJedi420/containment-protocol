# SPE-75 — Publish-queue GitHub API wiring (slice 1)

One-page implementation plan. Linear: [SPE-2488](https://linear.app/spectranoir/issue/SPE-2488) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2484](https://linear.app/spectranoir/issue/SPE-2484) per `planning/publish-queue-executor-slice-1.md` § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2488 — Publish-queue GitHub API wiring (slice 1)](https://linear.app/spectranoir/issue/SPE-2488) |
| **Status** | **Shipped** — PR #2896 @ `4acb1b9e` |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-publish-queue-github-api-slice-1` |
| **Base `main` SHA** | `f66edf73` |

## Goal

Smallest wiring slice for one publish channel stub (`pr-merge`) → real GitHub API call path with documented dry-run → live toggle — no SPE-75 parent reopen, no modifiable-pack UI.

## Prerequisite (on `main` @ `f66edf73`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Dry-run executor | `src/domain/publishQueueExecutor.ts` (SPE-2484 / PR #2888) |
| Publish-queue persistence | `publishQueueRecords` on `GameState` (SPE-2483 / PR #2886) |
| Weekly surfacing | `applyWeeklyPublishQueueExecutionTick` in `advanceWeek` (SPE-2485 / PR #2890) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publishQueueGitHubClient.ts` injectable fetch client for `pr-merge` | Additional publish channels |
| `executePublishQueueRecordLive` + batch helper | `advanceWeek` live mode (stays dry-run) |
| `PUBLISH_QUEUE_EXECUTOR_MODE` / env reader (`dry-run` default) | Mission triage (blocked) |
| API failure → reject without record mutation | SPE-75 parent status change |
| Idempotent already-merged handling | GameState execution-receipt persistence map |
| Mocked executor + client unit tests | Modifiable-pack UI |

## Live toggle contract

| Input | Behavior |
| --- | --- |
| Default / browser | `dry-run` — existing SPE-2484 stubs |
| `PUBLISH_QUEUE_EXECUTOR_MODE=live` + `GITHUB_REPOSITORY` + `GITHUB_TOKEN` | CI/automation may construct live client |
| `executePublishQueueRecordLive(..., { githubClient })` | Explicit live path for tests/ops scripts |

Pull request resolution for `pr-merge`:

- `publishHooks[].payload` suffix `channel:pr-merge:{n}`, or
- `releaseArtifactRef` pattern `release:pr:{n}`

## Acceptance

- [x] Live `pr-merge` success transitions `ready_to_publish` → `published` with `publishChannelRef`
- [x] API failure / unresolved PR rejects without mutation
- [x] Dry-run executor + weekly tick regression unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishQueueGitHubClient.ts`, `src/domain/publishQueueExecutor.ts` |
| Tests  | `src/test/publishQueueGitHubClient.test.ts`, `src/test/publishQueueExecutor.test.ts` |
| Plan   | `planning/publish-queue-github-api-slice-1.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Additional publish channels | SPE-75 follow-up child | Slice 1 wires `pr-merge` only |
| `advanceWeek` live orchestration | SPE-75 follow-up child | Browser default must stay dry-run |
| GameState execution-receipt persistence | SPE-75 follow-up child | Optional ledger beyond queue status transition |
| Surfacing labels for live receipts | SPE-75 follow-up child | Mirror copy still dry-run scoped |

## See also

- `planning/publish-queue-executor-slice-1.md`
- `planning/publish-queue-surfacing-slice-1.md`
- `planning/backlog.md`
