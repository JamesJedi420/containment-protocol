# SPE-868 — Post-incident review registry GameState persistence (slice 2)

One-page implementation plan. Linear: child [SPE-2371](https://linear.app/spectranoir/issue/SPE-2371) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 5 wire-up (`planning/recurrent-catastrophe-amelioration-registry-slice-5.md`, PR #2608 / [SPE-2370](https://linear.app/spectranoir/issue/SPE-2370)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2371 — Post-incident review registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2371) |
| **Status** | **Shipped** — pending PR merge                                                                               |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-post-incident-review-persistence-slice-2`                                                         |
| **Base `main` SHA** | `88f865e4`                                                                                          |

## Goal

Persist validated `PostIncidentReviewRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 5 deferred GameState persistence; weekly orchestration and mirror UI are out of scope.

## Prerequisite (on `main` @ `88f865e4`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/postIncidentReviewRegistry.ts` (SPE-868 slice 5 / PR #2608) |
| Fixtures             | `RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE`, `EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE`, `POST_INCIDENT_REVIEW_STUB_REGISTRY` |
| Ref wire-up          | `src/domain/recurrentCatastrophePostIncidentReviewLinks.ts` (SPE-2370) |
| Sibling persistence pattern | `planning/recurrent-catastrophe-amelioration-registry-slice-2.md` (SPE-2363 / PR #2595) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `postIncidentReviewRecords` on `GameState`                           | Weekly `advanceWeek` hook                     |
| `sanitizePostIncidentReviewRecords` + `runTransfer` hydrate wire   | Mirror UI / dev overlay                       |
| Seed stub fixtures in `createStartingState`                        | SPE-1310 parent closure                       |
| Sanitize unit tests + save/import round-trip (byte-stable)         | Changes to slice 5 wire-up API                |
| Franchise token scan on hydrate (drop invalid, no throw)           | Recurrent catastrophe slice 1–4 contract changes |

## Acceptance

- [x] Starting state seeds `POST_INCIDENT_REVIEW_STUB_REGISTRY`
- [x] Valid fixtures round-trip through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Dropped entries do not re-surface on hydrate
- [x] Franchise token payloads dropped on hydrate
- [x] `npm run lint` + targeted tests + slice 5 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/models.ts`                                                |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/postIncidentReviewRegistryPersistence.test.ts`              |
| Plan   | `planning/post-incident-review-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of persistence-only boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Case lifecycle transitions on compliance breach | SPE-1310 | Persistence only in slice 2 |
| Full SPE-868 retrospective engine | SPE-868 | Stub registry + persistence only; parent stays open |
| advanceWeek hook / mirror UI | SPE-868 follow-up | Persistence must land before orchestration |

## See also

- `planning/recurrent-catastrophe-amelioration-registry-slice-5.md`
- `src/test/recurrentCatastropheAmeliorationRegistryPersistence.test.ts`
