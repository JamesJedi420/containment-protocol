# SPE-75 — Publish-queue webhook channel (slice 1)

One-page implementation plan. Linear: [SPE-2499](https://linear.app/spectranoir/issue/SPE-2499) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2498](https://linear.app/spectranoir/issue/SPE-2498) per deferred webhook publish channel.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2499 — Publish-queue webhook channel (slice 1)](https://linear.app/spectranoir/issue/SPE-2499) |
| **Status** | **In Progress** |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-publish-queue-webhook-channel-slice-1` |
| **Base `main` SHA** | `e964c6ba` |

## Goal

Extend publish-queue live executor with one additional channel target (`webhook`) via injectable sync/async HTTP client. Reuse SPE-2495 receipt persistence and SPE-2496 mirror surfacing unchanged.

## Prerequisite (on `main` @ `e964c6ba`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Dry-run executor | `src/domain/publishQueueExecutor.ts` (SPE-2484 / PR #2888) |
| GitHub `pr-merge` client | `src/domain/publishQueueGitHubClient.ts` (SPE-2488 / PR #2896) |
| Manual-approval client | `src/domain/publishQueueManualApprovalClient.ts` (SPE-2498 / PR #2916) |
| Live weekly orchestration | `publishQueueWeeklyOrchestration.ts` (SPE-2491 / PR #2902) |
| Receipt persistence | `publishQueueExecutionReceiptPersistence.ts` (SPE-2495 / PR #2910) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publishQueueWebhookClient.ts` injectable HTTP client | Mission triage (blocked) |
| Live target router in executor (`pr-merge` + `manual-approval` + `webhook`) | SPE-75 parent reopen |
| Orchestration deps for `webhookClient` | Registry / pattern-source surfacing |
| Skip code `publish_channel_webhook_unresolved` | Receipt persistence shape changes |
| Executor + orchestration + integration tests | Modifiable-pack manifest default changes |

## Channel contract — `webhook`

| Source | Pattern | Example |
| --- | --- | --- |
| Hook payload | `channel:webhook` or `channel:webhook:{endpointId}` | `channel:webhook:release-batch-1` |
| `releaseArtifactRef` fallback | `release:webhook:{endpointId}` | `release:webhook:release-batch-1` |

Bare `channel:webhook` resolves to endpointId `default`.

Live success ref: `live:publish_channel:webhook:endpoint:{endpointId}:status:delivered`

Endpoint URLs resolve from a config map keyed by `endpointId`. Optional env: `PUBLISH_QUEUE_WEBHOOK_{ENDPOINT_ID}_URL` and `PUBLISH_QUEUE_WEBHOOK_{ENDPOINT_ID}_TOKEN` (uppercase id; `DEFAULT` for bare channel).

Auth token priority: hook payload suffix (if present) → endpoint config token → env token.

POST body (deterministic JSON): `{ recordId, releaseArtifactRef, endpointId, channelTarget, channelPayload }`.

## Live orchestration gate

| Input | Behavior |
| --- | --- |
| Default / browser / CI | `dry-run` — existing SPE-2484 stubs |
| `mode=live` + GitHub credentials | Live path for `pr-merge` records |
| `mode=live` + injectable `manualApprovalClient` | Live path for `manual-approval` records |
| `mode=live` + injectable `webhookClient` | Live path for `webhook` records |
| Mixed queue | Pass all configured clients; per-record dispatch |
| Failed HTTP / unresolved endpoint | Reject receipt; record byte-stable |
| Idempotent re-tick | `already_published` skip; no duplicate reportable notes |

## Acceptance

- [ ] Dry-run executes `webhook` records with stable stub + `published` transition
- [ ] Live path with injected sync client transitions on successful POST; failure/unresolved reject without mutation
- [ ] Existing `pr-merge` + `manual-approval` dry-run + live paths regression-clean
- [ ] `advanceWeek` persists reportable receipts and surfaces notes; mirror unchanged
- [ ] `npm run lint` + targeted tests green (CI gate)

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishQueueWebhookClient.ts`, `src/domain/publishQueueExecutor.ts`, `src/domain/publishQueueWeeklyOrchestration.ts`, `src/domain/publishQueueSurfacing.ts` |
| Tests  | `src/test/publishQueueWebhookClient.test.ts`, `src/test/publishQueueExecutor.test.ts`, `src/test/publishQueueWeeklyOrchestration.test.ts`, `src/test/advanceWeek.publishQueue.integration.test.ts`, `src/test/publishQueueSurfacing.test.ts` |
| Plan   | `planning/publish-queue-webhook-channel-slice-1.md`, `planning/backlog.md` |
| Docs   | `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mission triage publish-queue chips | Backlog | Mission triage full refresh blocked |
| Additional publish channels beyond pr-merge / manual-approval / webhook | SPE-75 follow-up | Out of slice boundary |

## See also

- `planning/publish-queue-manual-approval-channel-slice-1.md`
- `planning/publish-queue-github-api-slice-1.md`
- `planning/publish-queue-live-orchestration-slice-1.md`
- `planning/backlog.md`
