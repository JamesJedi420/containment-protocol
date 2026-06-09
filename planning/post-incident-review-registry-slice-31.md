# SPE-868 — Mission triage closeout reward payout UI (slice 31)

One-page implementation plan. Linear: child [SPE-2408](https://linear.app/spectranoir/issue/SPE-2408) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 30 (`planning/post-incident-review-registry-slice-30.md`, PR #2683 / [SPE-2407](https://linear.app/spectranoir/issue/SPE-2407)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2408 — Mission triage closeout reward payout UI (slice 31)](https://linear.app/spectranoir/issue/SPE-2408) |
| **Status** | **Shipped** — PR #2685 @ `2884509c`                                                                        |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (**Done** on Linear; owner-choice deferred slice) |
| **Branch** | `spe-868-mission-triage-closeout-payout-ui-slice-31`                                                       |
| **Base `main` SHA** | `3067179b`                                                                                          |

## Goal

Surface read-only closeout reward payout line labels on mission triage list rows for qualifying reviews linked to the case — reusing mirror `deriveCloseoutRewardPayoutLineLabelsForReview` and report-note metadata fallback. No numeric deltas; no payout logic changes.

## Prerequisite (on `main` @ `3067179b`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Payout line surfacing | slice 30 (SPE-2407) — `postIncidentReviewCloseoutRewardPayoutSurfacing.ts`, mirror `closeoutRewardPayoutLineLabels` |
| Mission triage chips  | slices 6–8 (SPE-2259 / SPE-2306 / SPE-2307) — `buildMissionTriageListRowChips` pattern |
| Report note category  | slice 30 — `post_incident_review.closeout_reward_payout` in `reportNoteView.ts` |

## Surfacing contract (this slice)

| Surface | Assertion |
| --- | --- |
| Triage list row | Compact chips `Closeout: funding` / `Closeout: training` with full mirror label in `title` |
| Primary source | Linked `review:case-{id}-closeout` / `review:near-catastrophe-{id}` records + `fundingHistory` |
| Fallback | `post_incident_review.closeout_reward_payout` report note metadata when mirror labels empty |
| Empty history | No chips |
| Stub exclusion | Orchestration-created reviews only (domain helper) |
| Ordering | Funding before training; review refs lexicographic; byte-stable repeats |

| Rule | Detail |
| --- | --- |
| **No amount leakage** | Chips use kind + branch labels only; never surface `fundingHistory.delta` |
| **Chip cap** | At most 2 payout markers per row (matches intake/modality caps) |
| **Triage unblocked** | Incremental chip slice — full triage refresh (compare-top-2, bulk actions) remains deferred per `ux/mission-triage.md` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `missionTriageCloseoutRewardPayoutSignalView.ts`                 | Payout tick (slice 29)                        |
| `caseView` / `missionTriageLayoutView` / triage view options     | Branch derivation (slice 28)                    |
| View unit tests                                                  | Post-incident orchestration core              |
| Slice doc (this file) + backlog row on ship                      | Registry schema expansion                     |
| `ux/mission-triage.md` spec status line                          | Full SPE-868 parent re-close                    |

## Acceptance

- [x] Qualifying closeout payout chips appear on triage rows when funding history entries exist
- [x] Report-note metadata fallback surfaces equivalent chips when mirror labels unavailable
- [x] Empty funding history / stub reviews → no chips
- [x] List-row chip integration via `buildMissionTriageListRowChips`
- [x] Slice 30 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/cases/missionTriageCloseoutRewardPayoutSignalView.ts`, `src/features/cases/caseView.ts`, `src/features/cases/missionTriageLayoutView.ts`, `src/features/cases/CasesPage.tsx`, `src/components/layout/ShellStatusBar.tsx` |
| Tests  | `src/test/missionTriageCloseoutRewardPayoutSignalView.test.ts`        |
| UX     | `ux/mission-triage.md`                                                |
| Plan   | `planning/post-incident-review-registry-slice-31.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mission triage full refresh (compare-top-2, bulk actions, §13 grouping) | Mission triage umbrella | Out of slice 31 chip boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |

## See also

- `planning/post-incident-review-registry-slice-30.md`
- `planning/mission-triage-intake-signal-slice.md`
