# SPE-868 — Post-incident review registry compose wire-up (slice 5)

One-page implementation plan. Linear: child [SPE-2374](https://linear.app/spectranoir/issue/SPE-2374) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 4 (`planning/post-incident-review-registry-slice-4.md`, PR #2614 / [SPE-2373](https://linear.app/spectranoir/issue/SPE-2373)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2374 — Post-incident review registry compose wire-up (slice 5)](https://linear.app/spectranoir/issue/SPE-2374) |
| **Status** | **Shipped** — PR #2616 @ `b90d1389`                                                                        |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-post-incident-review-compose-wire-up-slice-5`                                                     |
| **Base `main` SHA** | `3ea18a60`                                                                                          |

## Goal

Call `composeRecurrentCatastrophePostIncidentReviewLinks` (and targeted resolve/validate helpers) from runtime surfaces that already read `recurrentCatastropheRecords`, passing persisted `game.postIncidentReviewRecords` instead of stub-only maps.

## Prerequisite (on `main` @ `3ea18a60`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Domain link API      | `recurrentCatastrophePostIncidentReviewLinks.ts` (SPE-2370 / PR #2608) |
| Persistence          | `postIncidentReviewRecords` on `GameState` (SPE-2371 / PR #2610)       |
| Planning mirror UI   | `postIncidentReviewMirrorView` (SPE-2372 / PR #2612)                   |
| Weekly creation hook | `applyWeeklyPostIncidentReviewCreationTick` (SPE-2373 / PR #2614)      |
| Catastrophe mirror   | `recurrentCatastropheMirrorView` (SPE-2369 / PR #2606)                   |

## Compose wire-up contract

| Rule | Detail |
| --- | --- |
| **Review map source** | `game.postIncidentReviewRecords ?? {}` — hydrated persisted map only; no `POST_INCIDENT_REVIEW_STUB_REGISTRY` at compose sites. |
| **Catastrophe map source** | `game.recurrentCatastropheRecords ?? {}` — same read-only pattern as catastrophe mirror. |
| **Hydrated truth** | Skip invalid catastrophe records in compose; do not re-sanitize or surface dropped invalid review payloads. |
| **Warnings-only gaps** | Missing review refs and recurrence-without-review emit warning labels in view; not errors at compose sites. |
| **Post-tick resolution** | Reviews created by slice 4 weekly hook resolve on subsequent compose when refs match registry keys. |
| **Ordering** | Byte-stable sort by catastrophe record id; links sorted by review ref within each record. |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getRecurrentCatastrophePostIncidentReviewLinksView`               | New persistence fields                     |
| Compose wire-up in `recurrentCatastropheMirrorView` (warnings merge) | Mirror page / component UI changes            |
| Targeted view + GameState integration tests                        | Domain link API changes                       |
| Slice doc (this file) + backlog handoff on ship                    | Weekly orchestration / `advanceWeek` changes  |
|                                                                    | SPE-1310 lifecycle / full retrospective engine |

## Acceptance

- [x] Empty catastrophe or review map renders empty links view without throw
- [x] `RECURRENCE_DAMAGE_LEDGER_FIXTURE` resolves `review:cycle-3-closeout` from starting-state review map
- [x] Post-`advanceWeek` cycle-4 closeout appears in compose output when orchestration creates it
- [x] Missing review refs surface warnings-only in link/mirror views
- [x] Dropped invalid hydrated review entries are not re-surfaced at compose sites
- [x] Slice 4 integration + mirror regressions green
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/recurrentCatastrophePostIncidentReviewLinksView.ts`, `src/features/operations/recurrentCatastropheMirrorView.ts` |
| Tests  | `src/features/operations/recurrentCatastrophePostIncidentReviewLinksView.test.ts`, `src/test/recurrentCatastrophePostIncidentReviewLinks.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mirror page linked-review columns | SPE-868 follow-up | Out of compose wire-up boundary |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of compose wire-up boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Compose wire-up only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-4.md`
- `planning/recurrent-catastrophe-amelioration-registry-slice-5.md` — domain link API (SPE-2370)
