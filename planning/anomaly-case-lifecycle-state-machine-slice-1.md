# SPE-1310 — Anomaly case lifecycle state machine slice 1

One-page implementation plan. Linear: [SPE-2409](https://linear.app/spectranoir/issue/SPE-2409) (child under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310)). Closes first [SPE-2402](https://linear.app/spectranoir/issue/SPE-2402) AC gaps for named lifecycle stages and distinct lead/confirmation/containment/revision simulation stages.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2409 — Anomaly case lifecycle state machine — named stages and transition graph (slice 1)](https://linear.app/spectranoir/issue/SPE-2409) |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Anomaly case lifecycle state machine; stays **Backlog** |
| **Branch** | `spe-1310-anomaly-case-lifecycle-state-machine-slice-1`                                                    |
| **Status** | **Ready for PR**                                                                                           |
| **Base `main` SHA** | `e41ef4ca`                                                                                          |

## Goal

Add a pure deterministic **anomaly case lifecycle state machine** with named simulation stages (`lead`, `confirmation`, `containment`, `revision`) and an explicit transition graph — first runtime slice toward parent [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) acceptance criteria.

## Prerequisite (on `main` @ `e41ef4ca`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Parent grooming      | [SPE-2402](https://linear.app/spectranoir/issue/SPE-2402) / PR #2673 — AC gap table in `planning/spe-1310-parent-acceptance-review-slice-1.md` |
| Team state machine pattern | `src/domain/teamStateMachine.ts` + `src/test/teamStateMachine.test.ts` |
| Registry attach surfaces | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117), [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) sibling registries (Done; no lifecycle wire-up) |

## Gap (pre-slice)

- `CaseStatus` remains `open | in_progress | resolved` on `CaseInstance` — no lead→confirmation→containment→revision graph.
- No pure domain module for case lifecycle transitions; grooming deferred unified engine to follow-up slices.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `CaseLifecycleStage` + `CaseLifecycleEvent` in `src/domain/caseLifecycleStateMachine.ts` | `CaseInstance` field / hydrate wire-up      |
| Explicit transition table + `transitionCaseLifecycleStage`         | `advanceWeek` integration                     |
| `isValidCaseLifecycleTransition`, `getCaseLifecycleEventSequence`, `applyCaseLifecycleEventSequence` | UI surfacing                                  |
| Research invalidation loop (`containment` ↔ `revision`)            | `presumed_neutralized` disposition            |
| Focused tests in `src/test/caseLifecycleStateMachine.test.ts`      | Policy-tier upgrade on adaptation             |
| Slice doc (this file) + backlog shipped row on merge               | Institutional vs operational tier split       |
|                                                                    | Full SPE-1310 parent Done                     |

## Transition contract (deterministic)

| From | Event | To |
| --- | --- | --- |
| `lead` | `credibility_review_passed` | `confirmation` |
| `confirmation` | `anomaly_confirmed` | `containment` |
| `containment` | `research_invalidation` | `revision` |
| `revision` | `procedure_revised` | `containment` |

Invalid events preserve the current stage (same pattern as `teamStateMachine.ts`).

## SPE-2402 AC gaps addressed

| Parent AC | This slice | Met? |
| --- | --- | --- |
| Case lifecycle has named states with explicit transitions | Four named stages + transition table in domain module | **Partial** — runtime graph exists; not yet on `CaseInstance` |
| Lead, confirmation, containment, and revision are distinct simulation stages | Distinct union members with separate transition edges | **Partial** — domain only |
| Research can materially change containment assumptions and move the case into a new state | `research_invalidation` / `procedure_revised` loop | **Partial** — transition hooks only; no simulation triggers |

## Acceptance

- [x] Named lifecycle stages with explicit deterministic transitions
- [x] Lead, confirmation, containment, revision distinct in transition graph
- [x] Research invalidation path present (`containment` → `revision` → `containment`)
- [x] `npm run lint` + targeted `npm run test:run` green

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| `CaseInstance.lifecycleStage` persistence + hydrate | SPE-1310 slice 2 | Slice 1 is pure domain graph only |
| `advanceWeek` lifecycle tick / intake registry wire-up | SPE-1310 follow-up | Requires persisted stage + trigger sources |
| `presumed_neutralized` disposition with surveillance clocks | SPE-1310 / SPE-921 | Parent AC; not in slice-1 graph |
| Policy-revision-on-adaptation tier upgrade transition | SPE-1310 | Parent AC; adaptation trigger deferred |
| Institutional classification vs operational risk tier split | SPE-1310 | Parent scope constraint |
| Legacy `CaseStatus` mapping / migration | SPE-1310 follow-up | Preserve mistaken records; map in dedicated slice |

## Validation

- `npm run lint`
- `npm run test:run src/test/caseLifecycleStateMachine.test.ts`

## See also

- `planning/spe-1310-parent-acceptance-review-slice-1.md`
- `src/domain/teamStateMachine.ts`
