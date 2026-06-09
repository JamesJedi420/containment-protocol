# SPE-868 — Branching reward logic on qualifying closeout paths (slice 28)

One-page implementation plan. Linear: child [SPE-2403](https://linear.app/spectranoir/issue/SPE-2403) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 27 (`planning/post-incident-review-registry-slice-27.md`, PR #2661 / [SPE-2396](https://linear.app/spectranoir/issue/SPE-2396)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2403 — Branching reward logic on qualifying closeout paths (slice 28)](https://linear.app/spectranoir/issue/SPE-2403) |
| **Status** | **Ready for ship**                                                                                         |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (**Done** on Linear; owner-choice deferred slice) |
| **Branch** | `spe-868-branching-reward-slice-28`                                                                        |
| **Base `main` SHA** | `2355dbc0`                                                                                          |

## Goal

Pure domain branching reward logic on qualifying post-incident review closeout paths — derive how objectives were completed and persist bounded `reward_branch:` tokens without expanding registry schema.

## Prerequisite (on `main` @ `2355dbc0`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Qualifying closeout creation | slice 7 (SPE-2376)                                              |
| Follow-on artifact tokens | slice 10 (SPE-2379)                                               |
| Mirror label stack | slices 22–27 (SPE-2391–SPE-2396)                                       |
| Milestone derivation | slice 20 (SPE-2389)                                                |

## Reward branch contract (this slice)

| Closeout path | Derivation inputs | Branch |
| --- | --- | --- |
| Qualifying case closeout (`review:case-*-closeout`) | `closureOutcome === contained` and `procedureAdherenceScore >= 0.65` | `containment_priority` |
| Qualifying case closeout (else) | lower adherence or non-contained outcome on closeout path | `contested_containment` |
| Near-catastrophe (`review:near-catastrophe-*`) | external-audit / administratively-cleared template | `threshold_mitigation` |
| Cycle closeout (`review:cycle-*-closeout`) | `recurrenceObserved === true` | `recurrence_softening` |
| Cycle closeout (else) | recurrence not observed | `containment_priority` |

| Rule | Detail |
| --- | --- |
| **Persistence** | `reward_branch:<branch>` token in `unknownFields`; no new registry fields |
| **Apply tick** | `applyWeeklyPostIncidentReviewCloseoutRewardBranchTick` after creation, before follow-on artifact |
| **Eligibility** | Orchestration-created reviews only; stub fixtures unchanged |
| **Idempotency** | Re-advance same week does not append duplicate tokens |
| **Mirror** | `closeoutRewardBranchLabel` via `derivePostIncidentCloseoutRewardBranch` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `postIncidentReviewCloseoutRewardBranch.ts` derivation + apply tick | Registry schema expansion                     |
| `advanceWeek` wire after creation tick                           | Mission triage / funding payout hooks         |
| Mirror `closeoutRewardBranchLabel`                               | SPE-1310 lifecycle                            |
| Domain unit tests + one case-closeout integration assertion      | Compliance audit cycling (deferred slice 20)  |
| Slice doc (this file) + backlog handoff on ship                  | Full SPE-868 parent re-close                  |

## Acceptance

- [x] Registry exports deterministic closeout reward branch derivation for case, near-catastrophe, and cycle closeout paths
- [x] `advanceWeek` applies reward-branch tick after creation; tokens sorted in `unknownFields`
- [x] Domain unit tests cover all four branches + idempotency + stub exclusion
- [x] Qualifying case closeout integration asserts `reward_branch:containment_priority` + mirror label
- [x] Slice 7–27 regressions green; `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewCloseoutRewardBranch.ts`, `src/domain/sim/advanceWeek.ts` |
| Mirror | `src/features/operations/postIncidentReviewMirrorView.ts`             |
| Tests  | `src/test/postIncidentReviewCloseoutRewardBranch.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-28.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mission payout / funding hooks reading reward branch | SPE-868 follow-up | Domain token only; no payout integration in slice 28 |
| Compliance audit cycling | SPE-868 | Deferred per slice 20; not conflated with reward branching |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Branching reward slice only; parent already **Done** on Linear |

## See also

- `planning/post-incident-review-registry-slice-20.md` (branching reward deferral)
- `planning/post-incident-review-registry-slice-21.md` (branching reward deferral)
- `planning/post-incident-review-registry-slice-7.md`
- `planning/post-incident-review-registry-slice-10.md`
