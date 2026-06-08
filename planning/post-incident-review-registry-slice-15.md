# SPE-868 — Post-incident recommendation registry planning mirror UI (slice 15)

One-page implementation plan. Linear: child [SPE-2384](https://linear.app/spectranoir/issue/SPE-2384) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 14 (`planning/post-incident-review-registry-slice-14.md`, PR #2634 / [SPE-2383](https://linear.app/spectranoir/issue/SPE-2383)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2384 — Post-incident recommendation registry planning mirror UI (slice 15)](https://linear.app/spectranoir/issue/SPE-2384) |
| **Status** | **In progress** |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (do not re-close) |
| **Branch** | `spe-868-review-recommendation-registry-mirror-slice-15`                                                         |
| **Base `main` SHA** | `00859fb7`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `postIncidentReviewRecommendationRecords` — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `00859fb7`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Recommendation schema | `src/domain/postIncidentReviewRecommendationRegistry.ts` (SPE-2383 / slice 14) |
| Persistence          | `postIncidentReviewRecommendationRecords` on `GameState` (slice 14)    |
| Sibling mirror template | `postIncidentReviewMirrorView` (SPE-2372 slice 3), qualifying rows (slice 8) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getPostIncidentReviewRecommendationMirrorView` + page             | Training enqueue path changes                 |
| Route `/post-incident-review-recommendations` + Front Desk quick link | Follow-on artifact/qualification rules     |
| View + component tests                                             | New `advanceWeek` hooks                       |
| Slice doc (this file) + backlog handoff on ship                    | SPE-1310 parent closure                       |
| Link `reviewRef` to qualifying post-incident review mirror rows    | Re-validation of hidden/dropped records       |
|                                                                    | SPE-868 parent closure                        |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted recommendation records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Fields surfaced** — id, label, reviewRef, stubSuffix, orchestrationWeek.
- **Review linkage** — when `reviewRef` matches a qualifying incident row in `getPostIncidentReviewMirrorView`, surface linked review label, source, and case id; link to post-incident review mirror route.
- **Empty state** — when `postIncidentReviewRecommendationRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id (`localeCompare`).
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `postIncidentReviewRecommendationRecords` map renders empty state without throw
- [x] Records table shows id, label, reviewRef, stubSuffix, orchestrationWeek
- [x] Qualifying review linkage surfaces when reviewRef matches orchestration-created qualifying rows
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/postIncidentReviewRecommendationMirrorView.ts` |
| UI     | `src/features/operations/PostIncidentReviewRecommendationMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/postIncidentReviewRecommendationMirrorView.test.ts`, `src/features/operations/PostIncidentReviewRecommendationMirrorPage.test.tsx` |
| Plan   | `planning/post-incident-review-registry-slice-15.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of mirror UI boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Recommendation mirror only; parent stays open |
| Recommendation action/training wire-up | SPE-868 follow-up | Mirror display only this slice |

## See also

- `planning/post-incident-review-registry-slice-14.md`
- `planning/post-incident-review-registry-slice-3.md` — sibling mirror UI template
