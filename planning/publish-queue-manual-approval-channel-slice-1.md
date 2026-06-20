# SPE-75 — Publish-queue manual-approval channel (slice 1)

One-page implementation plan. Linear: [SPE-2498](https://linear.app/spectranoir/issue/SPE-2498) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2488](https://linear.app/spectranoir/issue/SPE-2488) / [SPE-2491](https://linear.app/spectranoir/issue/SPE-2491) per deferred additional publish channels.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2498 — Publish-queue manual-approval channel (slice 1)](https://linear.app/spectranoir/issue/SPE-2498) |
| **Status** | **In Progress** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-publish-queue-manual-approval-channel-slice-1` |
| **Base `main` SHA** | `f5b91540` |

## Goal

Extend publish-queue live executor with one additional channel target (`manual-approval`) via injectable sync approval client. Reuse SPE-2495 receipt persistence and SPE-2496 mirror surfacing unchanged.

## Prerequisite (on `main` @ `f5b91540`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Dry-run executor | `src/domain/publishQueueExecutor.ts` (SPE-2484 / PR #2888) |
| GitHub `pr-merge` client | `src/domain/publishQueueGitHubClient.ts` (SPE-2488 / PR #2896) |
| Live weekly orchestration | `publishQueueWeeklyOrchestration.ts` (SPE-2491 / PR #2902) |
| Receipt persistence | `publishQueueExecutionReceiptPersistence.ts` (SPE-2495 / PR #2910) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publishQueueManualApprovalClient.ts` injectable sync client | Webhook HTTP channel |
| Live target router in executor (`pr-merge` + `manual-approval`) | Mission triage (blocked) |
| Orchestration deps for `manualApprovalClient` | SPE-75 parent reopen |
| Skip code `publish_channel_approval_unresolved` | Registry / pattern-source surfacing |
| Executor + orchestration + integration tests | Receipt persistence shape changes |

## Channel contract — `manual-approval`

| Source | Pattern | Example |
| --- | --- | --- |
| Hook payload | `channel:manual-approval` or `channel:manual-approval:{token}` | `channel:manual-approval:release-batch-1` |
| `releaseArtifactRef` fallback | `release:approval:{token}` | `release:approval:release-batch-1` |

Bare `channel:manual-approval` resolves to token `default`.

Live success ref: `live:publish_channel:manual-approval:token:{token}:status:approved`

## Live orchestration gate

| Input | Behavior |
| --- | --- |
| Default / browser / CI | `dry-run` — existing SPE-2484 stubs |
| `mode=live` + GitHub credentials | Live path for `pr-merge` records |
| `mode=live` + injectable `manualApprovalClient` | Live path for `manual-approval` records (GitHub creds optional) |
| Mixed queue | Pass both clients when configured; per-record dispatch |
| Failed approval / unresolved token | Reject receipt; record byte-stable |
| Idempotent re-tick | `already_published` skip; no duplicate reportable notes |

## Acceptance

- [ ] Dry-run executes `manual-approval` records with stable stub + `published` transition
- [ ] Live path with injected sync client transitions on approval; deny/unresolved reject without mutation
- [ ] Existing `pr-merge` dry-run + live paths regression-clean
- [ ] `advanceWeek` persists reportable receipts and surfaces notes; mirror unchanged
- [ ] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishQueueManualApprovalClient.ts`, `src/domain/publishQueueExecutor.ts`, `src/domain/publishQueueWeeklyOrchestration.ts`, `src/domain/publishQueueSurfacing.ts` |
| Tests  | `src/test/publishQueueManualApprovalClient.test.ts`, `src/test/publishQueueExecutor.test.ts`, `src/test/publishQueueWeeklyOrchestration.test.ts`, `src/test/advanceWeek.publishQueue.integration.test.ts`, `src/test/publishQueueSurfacing.test.ts` |
| Plan   | `planning/publish-queue-manual-approval-channel-slice-1.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Webhook publish channel | SPE-75 follow-up child | HTTP side effects out of stub-channel slice |
| Mission triage publish-queue chips | Backlog | Mission triage full refresh blocked |

## See also

- `planning/publish-queue-github-api-slice-1.md`
- `planning/publish-queue-live-orchestration-slice-1.md`
- `planning/publish-queue-execution-receipt-persistence-slice-1.md`
- `planning/backlog.md`
