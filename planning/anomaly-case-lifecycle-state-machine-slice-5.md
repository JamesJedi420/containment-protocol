# SPE-1310 — Anomaly case lifecycle state machine slice 5

One-page implementation plan. Linear: [SPE-2413](https://linear.app/spectranoir/issue/SPE-2413) (child under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310)). Follows shipped slice 4 (`planning/anomaly-case-lifecycle-state-machine-slice-4.md`, PR #2693).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2413 — presumed_neutralized disposition + adaptation policy-tier hook (slice 5)](https://linear.app/spectranoir/issue/SPE-2413) |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Anomaly case lifecycle state machine; stays **Backlog** until remaining AC gaps close |
| **Branch** | `spe-1310-anomaly-case-lifecycle-state-machine-slice-5`                                                    |
| **Status** | Ready for PR                                                                                               |
| **Base `main` SHA** | `df9c299b`                                                                                          |

## Goal

Add `presumed_neutralized` lifecycle disposition with surveillance/breach-readiness clocks and a weekly adaptation hook that upgrades `containmentPolicyTier` without remapping `CaseStatus` or touching mission triage UI.

## Prerequisite (on `main` @ `df9c299b`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Lifecycle graph      | `src/domain/caseLifecycleStateMachine.ts` (SPE-2409 / PR #2687)        |
| Stage persistence    | `CaseInstance.lifecycleStage` hydrate (SPE-2410 / PR #2689)            |
| Slice 3–4 weekly tick | intake, extranormal, compliance containment ↔ revision (SPE-2411–2412) |
| Recurrence weekly tick | `applyWeeklyRecurrentCatastropheTick` (SPE-2117 slice 3)            |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `presumed_neutralized` stage + `presumed_neutralized_entered` event | Mission triage UI                             |
| Surveillance clocks on disposition entry                           | Slice 3–4 event mapping changes               |
| Weekly trigger: `revision:presumed-neutralized` while compliant    | Compliance registry decay semantics           |
| `containmentPolicyTier` upgrade on catastrophe recurrence advance  | Institutional vs operational classification split |
| Wire prior/next `recurrentCatastropheRecords` through lifecycle tick | Full SPE-1310 parent Done                  |
| Unit + integration tests; slice 4 regression unchanged             | Legacy `CaseStatus` remapping                 |

## Event / disposition mapping

| Signal | Weekly source | Effect |
| --- | --- | --- |
| `presumed_neutralized_entered` | Linked compliance record gains `revision:presumed-neutralized` while `complianceState` stays `compliant` | `containment` → `presumed_neutralized`; set `lifecycleSurveillanceDueWeek` (+4) and `lifecycleBreachReadinessDueWeek` (+8) |
| Policy-tier upgrade | Linked recurrent catastrophe `recurrenceCount` increases (post recurrence tick) | `containment` stays; `containmentPolicyTier` escalates `standard` → `elevated` → `critical` |

Explicit linkage: compliance `documentRef` or catastrophe `id` must equal case `id` or `templateId`. Invalid events preserve the current stage.

## Acceptance

- [x] Containment case enters `presumed_neutralized` with non-zero surveillance clocks when false-clear revision is logged
- [x] Containment case upgrades `containmentPolicyTier` when linked catastrophe recurs
- [x] Slice 4 containment ↔ revision loop unchanged
- [x] Cases without `lifecycleStage` remain unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/caseLifecycleStateMachine.ts`, `src/domain/caseLifecycleWeeklyOrchestration.ts`, `src/domain/models.ts`, `src/domain/case/normalizeCase.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/caseLifecycleStateMachine.test.ts`, `src/test/caseLifecycleWeeklyOrchestration.test.ts`, `src/test/advanceWeek.caseLifecycle.integration.test.ts`, `src/test/caseLifecycleStagePersistence.test.ts` |
| Plan   | `planning/anomaly-case-lifecycle-state-machine-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| UI surfacing on mission triage / cases board | Mission triage refresh | Blocked per `ux/mission-triage.md` |
| Institutional classification vs operational risk tier split | [SPE-2414](https://linear.app/spectranoir/issue/SPE-2414) slice 6 | Shipped — `lifecycleInstitutionalLabel` + weekly projection hook |
| Surveillance clock re-arm on weekly tick while in presumed_neutralized | SPE-1310 / SPE-921 | Entry clocks only; recurring surveillance obligations deferred |
| SPE-921 haunted-site false-clear registry wire-up | SPE-921 | Compliance revision ref is deterministic stand-in |
| Legacy `CaseStatus` mapping / migration | SPE-1310 follow-up | Preserve mistaken records; map in dedicated slice |
| Full SPE-1310 parent Done | SPE-1310 | Institutional-vs-operational split closed in slice 6 |

## Validation

- `npm run lint`
- `npm run test:run src/test/caseLifecycleStateMachine.test.ts src/test/caseLifecycleWeeklyOrchestration.test.ts src/test/advanceWeek.caseLifecycle.integration.test.ts src/test/caseLifecycleStagePersistence.test.ts`

## See also

- `planning/anomaly-case-lifecycle-state-machine-slice-4.md`
- `planning/spe-1310-parent-acceptance-review-slice-1.md`
- `src/domain/caseLifecycleStateMachine.ts`
