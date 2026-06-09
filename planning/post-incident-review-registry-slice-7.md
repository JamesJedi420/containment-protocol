# SPE-868 — Qualifying incident retrospective creation hook (slice 7)

One-page implementation plan. Linear: child [SPE-2376](https://linear.app/spectranoir/issue/SPE-2376) under [SPE-868](https://linear.app/spectranoir/issue/SPE-868). Follows shipped slice 6 (`planning/post-incident-review-registry-slice-6.md`, PR #2618 / [SPE-2375](https://linear.app/spectranoir/issue/SPE-2375)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2376 — Qualifying incident retrospective creation hook (slice 7)](https://linear.app/spectranoir/issue/SPE-2376) |
| **Status** | **Shipped** — PR #2620 @ `f02c4711`                                                                        |
| **Parent** | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) — Post-incident review and response metrics (stays open) |
| **Branch** | `spe-868-qualifying-incident-retrospective-slice-7`                                                        |
| **Base `main` SHA** | `3a255a0a`                                                                                          |

## Goal

Extend weekly post-incident review orchestration to create `PostIncidentReviewRecord` entries when qualifying cases resolve or near-catastrophe thresholds fire — not only recurrence-cycle closeout refs.

## Prerequisite (on `main` @ `3a255a0a`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Recurrence creation hook | `applyWeeklyPostIncidentReviewCreationTick` (SPE-2373 / PR #2614)  |
| Compose wire-up      | `getRecurrentCatastrophePostIncidentReviewLinksView` (SPE-2374 / PR #2616) |
| Mirror linked-review columns | `RecurrentCatastropheMirrorPage` (SPE-2375 / PR #2618)         |
| Near-catastrophe threshold | `isMajorIncidentCase` in `majorIncidents.ts` (SPE-36)              |
| Case event drafts      | `eventDraftPipeline.ts` + `advanceWeek` resolution/escalation paths    |

## Orchestration tick contract (slice 7)

| Step | Rule |
| --- | --- |
| **Qualifying threshold** | Reuse `isMajorIncidentCase`: `kind === 'raid'`, `stage >= 4`, or `stage >= 3 && deadlineRemaining <= 1`. |
| **Case resolved trigger** | `case.resolved` event draft where post-resolution snapshot qualifies → `review:case-{caseId}-closeout`. |
| **Near-catastrophe trigger** | `case.escalated` crossing into qualifying band, or `case.raid_converted` → `review:near-catastrophe-{caseId}`. |
| **Precedence** | Resolved closeout wins over near-catastrophe draft for same `caseId` same week. |
| **Creation templates** | Case closeout: internal_command / contained with 4-milestone span; near-catastrophe: external_audit / administratively_cleared with 3-milestone span. |
| **Idempotency** | Skip refs already present; append `orchestration_week:<week>`; re-tick same week is a no-op. |
| **Empty inputs** | No catastrophes and no qualifying drafts → return same review map reference. |
| **Recurrence path** | Slice 4 recurrence closeout behavior unchanged. |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `resolveQualifyingIncidentReviewDraftsFromEventDrafts` + builders  | Mirror UI changes                             |
| Extend `applyWeeklyPostIncidentReviewCreationTick`                 | Domain schema expansion beyond existing fields |
| `advanceWeek` passes `context.eventDrafts` + prior case snapshots  | Domain link API changes                       |
| Domain + integration tests                                         | SPE-1310 lifecycle                            |
| Slice doc (this file) + backlog handoff on ship                    | Full SPE-868 parent closure                   |

## Acceptance

- [x] Qualifying resolved cases materialize `review:case-{id}-closeout` records
- [x] Near-catastrophe threshold events materialize `review:near-catastrophe-{id}` records
- [x] Re-tick same week is idempotent; non-qualifying cases do not create reviews
- [x] Existing recurrence closeout behavior unchanged
- [x] Slice 5/6 compose + mirror regressions green
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/postIncidentReviewWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/postIncidentReviewWeeklyOrchestration.test.ts`, `src/test/advanceWeek.postIncidentReview.integration.test.ts` |
| Plan   | `planning/post-incident-review-registry-slice-7.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mirror surfacing of qualifying case reviews | SPE-868 follow-up | Out of orchestration boundary |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 | Out of orchestration boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Full SPE-868 retrospective engine | SPE-868 | Qualifying-incident hook only; parent stays open |

## See also

- `planning/post-incident-review-registry-slice-4.md`
- `planning/post-incident-review-registry-slice-6.md`
- `docs/major-incidents-audit.md` — near-catastrophe eligibility rules
