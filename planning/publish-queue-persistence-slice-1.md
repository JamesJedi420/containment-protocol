# SPE-75 — GameState publish-queue persistence (slice 1)

One-page implementation plan. Linear: [SPE-2483](https://linear.app/spectranoir/issue/SPE-2483) (child under [SPE-75](https://linear.app/spectranoir/issue/SPE-75)). Follows shipped [SPE-2480](https://linear.app/spectranoir/issue/SPE-2480) per `planning/publish-automation-crediting-hooks-slice-1.md` § Deferred.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2483 — GameState publish-queue persistence (slice 1)](https://linear.app/spectranoir/issue/SPE-2483) |
| **Status** | **Shipped** — PR #2886 @ `93711130` |
| **Parent** | [SPE-75](https://linear.app/spectranoir/issue/SPE-75) — parent **Done** on Linear (do not reopen) |
| **Branch** | `spe-75-publish-queue-persistence-slice-1` |
| **Base `main` SHA** | `14b42088` |

## Goal

Persist validated publish-queue records on `GameState` with sanitize/hydration and save round-trip tests. Composes read-only with `publishAutomationCreditingHooks.ts` (SPE-2480). No runtime publish executor or UI.

## Prerequisite (on `main` @ `14b42088`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Publish-intent module | `src/domain/publishAutomationCreditingHooks.ts` (SPE-2480) |
| Registry persistence pattern | `planning/visual-trigger-hazard-registry-slice-2.md` (SPE-2336) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `publishQueueRecords` on `GameState` | Runtime publish executor / CI wiring |
| `sanitizePublishQueueRecords` + `runTransfer` hydrate wire | Route/UI changes |
| `composePublishQueueRecord` read-only from publish decisions | Mission triage (blocked) |
| Default `{}` in `createStartingState` | SPE-947 / SPE-1046 parent changes |
| Sanitize unit tests + save/import round-trip (byte-stable) | Registry slice 5+ |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] `composePublishQueueRecord` matches canonical fixture from upstream chain
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/publishAutomationCreditingHooks.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/publishQueuePersistence.test.ts` |
| Plan   | `planning/publish-queue-persistence-slice-1.md`, `planning/backlog.md` |
| Docs   | optional cross-ref in `docs/contribution-and-release-operations.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Runtime publish executor / CI wiring | SPE-75 follow-up child | Requires automation integration beyond persistence |
| Publish-queue UI / weekly orchestration | SPE-75 follow-up child | Persistence must land before surfacing |

## See also

- `planning/publish-automation-crediting-hooks-slice-1.md`
- `planning/visual-trigger-hazard-registry-slice-2.md`
- `planning/backlog.md`
