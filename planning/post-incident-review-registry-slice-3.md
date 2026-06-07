# SPE-868 — Post-incident review registry planning mirror UI (slice 3)

One-page implementation plan. Linear: child [SPE-2372](https://linear.app/spectranoir/issue/SPE-2372) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 2 (`planning/post-incident-review-registry-slice-2.md`, PR #2610 / [SPE-2371](https://linear.app/spectranoir/issue/SPE-2371)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2372 — Post-incident review registry planning mirror UI (slice 3)](https://linear.app/spectranoir/issue/SPE-2372) |
| **Status** | **Ready for PR**                                                                                           |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-post-incident-review-mirror-ui-slice-3`                                                         |
| **Base `main` SHA** | `18c81f42`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `postIncidentReviewRecords` and `projectPostIncidentReviewSummary` projection — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `18c81f42`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/postIncidentReviewRegistry.ts` (SPE-868 slice 5 / PR #2608) |
| Persistence          | `postIncidentReviewRecords` on `GameState` (SPE-2371 / PR #2610)       |
| Ref wire-up          | `src/domain/recurrentCatastrophePostIncidentReviewLinks.ts` (SPE-2370) |
| Sibling mirror template | `recurrentCatastropheMirrorView` (SPE-2369), `ruleDocumentComplianceMirrorView` (SPE-2368) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getPostIncidentReviewMirrorView` + `PostIncidentReviewMirrorPage` | New persistence fields                     |
| Route `/post-incident-review` + Front Desk quick link               | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-1310 parent closure                       |
| Slice doc (this file) + backlog handoff on ship                    | Re-validation of hidden/dropped records       |
| Summary projection via `projectPostIncidentReviewSummary`          | Slice 5 wire-up API changes                   |
|                                                                    | `advanceWeek` retrospective creation hook     |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run franchise token scan or surface dropped invalid entries.
- **Summary projection** — `projectPostIncidentReviewSummary(record)`; display-only, no tick mutation.
- **Legibility gaps** — redacted or unknown projection fields render as `—`, not hidden truth.
- **Empty state** — when `postIncidentReviewRecords` map is empty after hydrate.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `postIncidentReviewRecords` map renders empty state without throw
- [x] Records table shows review route, closure outcome, milestone span, procedure adherence, recurrence observed, and confidence from projection
- [x] Redacted/unknown projection fields render as legibility gaps
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests + slice 5 link regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/postIncidentReviewMirrorView.ts`           |
| UI     | `src/features/operations/PostIncidentReviewMirrorPage.tsx`        |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/postIncidentReviewMirrorView.test.ts`, `src/features/operations/PostIncidentReviewMirrorPage.test.tsx` |
| Plan   | `planning/post-incident-review-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of mirror UI boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Case lifecycle transitions on compliance breach | SPE-1310 | Mirror display only in slice 3 |
| Full SPE-868 retrospective engine | SPE-868 | Stub registry + mirror only; parent stays open |
| advanceWeek retrospective creation hook | SPE-868 follow-up | Mirror must land before orchestration |
| Wire slice 5 compose call sites to `game.postIncidentReviewRecords` | SPE-868 follow-up | Out of mirror-only boundary |

## See also

- `planning/post-incident-review-registry-slice-2.md`
- `planning/recurrent-catastrophe-amelioration-registry-slice-4.md` — sibling mirror UI template (SPE-2369)
