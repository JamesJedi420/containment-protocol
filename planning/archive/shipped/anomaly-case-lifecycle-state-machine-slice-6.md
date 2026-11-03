# SPE-1310 — Anomaly case lifecycle state machine slice 6

One-page implementation plan. Linear: [SPE-2414](https://linear.app/spectranoir/issue/SPE-2414) (child under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310)). Follows shipped slice 5 (`planning/anomaly-case-lifecycle-state-machine-slice-5.md`, PR #2695).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2414 — institutional vs operational classification split (slice 6)](https://linear.app/spectranoir/issue/SPE-2414) |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Anomaly case lifecycle state machine |
| **Branch** | `spe-1310-anomaly-case-lifecycle-state-machine-slice-6`                                                    |
| **Status** | Ready for PR                                                                                               |
| **Base `main` SHA** | `df6a9ad9`                                                                                          |

## Goal

Add `lifecycleInstitutionalLabel` on `CaseInstance` — institutional filing classification distinct from `lifecycleStage` and operational `containmentPolicyTier` — with sanitize/hydrate wire-up and weekly projection in `applyWeeklyCaseLifecycleTick`.

## Prerequisite (on `main` @ `df6a9ad9`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Lifecycle graph      | `src/domain/caseLifecycleStateMachine.ts` (SPE-2409 / PR #2687)        |
| Stage persistence    | `CaseInstance.lifecycleStage` hydrate (SPE-2410 / PR #2689)            |
| Slice 3–5 weekly tick | intake, compliance, presumed_neutralized, policy-tier upgrade (SPE-2411–2413) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `CaseLifecycleInstitutionalLabel` type + `projectLifecycleInstitutionalLabel` | Mission triage UI                             |
| `lifecycleInstitutionalLabel?: …` on `CaseInstance` + hydrate      | Slice 3–5 event mapping changes               |
| Weekly projection hook in `applyWeeklyCaseLifecycleTick`           | Compliance decay semantics                    |
| Starter default `preliminary_intake` for cases with `lifecycleStage: lead` | Full SPE-1310 parent reopen (already Done after slice 5) |
| Sanitize/hydrate round-trip + slice 5 regression tests             | Legacy `CaseStatus` remapping                 |

## Institutional vs operational split

| Field | Role |
| --- | --- |
| `lifecycleStage` | Simulation disposition graph node |
| `containmentPolicyTier` | Operational risk tier (`standard` / `elevated` / `critical`) |
| `lifecycleInstitutionalLabel` | Official filing classification copy (e.g. `active_anomaly_file`, `presumed_clear_surveillance_obligations`) |

`presumed_clear_surveillance_obligations` encodes ongoing surveillance duty — not a safety-cleared label while clocks are active.

## Acceptance

- [x] Institutional label persists and round-trips through save/hydrate
- [x] Weekly tick projects label from `lifecycleStage` only (policy-tier upgrades unchanged)
- [x] `presumed_neutralized` maps to surveillance-obligation institutional copy
- [x] Slice 5 disposition + policy-tier hooks unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/caseLifecycleStateMachine.ts`, `src/domain/caseLifecycleWeeklyOrchestration.ts`, `src/domain/models.ts`, `src/domain/case/normalizeCase.ts`, `src/domain/templates/startingCases.ts` |
| Tests  | `src/test/caseLifecycleStateMachine.test.ts`, `src/test/caseLifecycleWeeklyOrchestration.test.ts`, `src/test/caseLifecycleInstitutionalLabelPersistence.test.ts` |
| Plan   | `planning/anomaly-case-lifecycle-state-machine-slice-6.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| UI surfacing on mission triage / cases board | Mission triage refresh | Blocked per `ux/mission-triage.md` |
| Player-facing formatted institutional copy | Mission triage / report surfacing | Domain label only; mirror/report wiring deferred |
| Surveillance clock re-arm affecting institutional label | SPE-1310 / SPE-921 | Entry clocks only; recurring obligation copy deferred |
| Legacy `CaseStatus` mapping / migration | SPE-1310 follow-up | Preserve mistaken records; map in dedicated slice |

## Validation

- `npm run lint`
- `npm run test:run src/test/caseLifecycleStateMachine.test.ts src/test/caseLifecycleWeeklyOrchestration.test.ts src/test/caseLifecycleInstitutionalLabelPersistence.test.ts src/test/caseLifecycleStagePersistence.test.ts src/test/advanceWeek.caseLifecycle.integration.test.ts`

## See also

- `planning/anomaly-case-lifecycle-state-machine-slice-5.md`
- `planning/spe-1310-parent-acceptance-review-slice-1.md`
- `src/domain/caseLifecycleStateMachine.ts`
