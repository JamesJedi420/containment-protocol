# SPE-1310 — Anomaly case lifecycle state machine slice 4

One-page implementation plan. Linear: [SPE-2412](https://linear.app/spectranoir/issue/SPE-2412) (child under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310)). Follows shipped slice 3 (`planning/anomaly-case-lifecycle-state-machine-slice-3.md`, PR #2690).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2412 — research_invalidation / procedure_revised weekly hooks (slice 4)](https://linear.app/spectranoir/issue/SPE-2412) |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Anomaly case lifecycle state machine; stays **Backlog** until remaining AC gaps close |
| **Branch** | `spe-1310-anomaly-case-lifecycle-state-machine-slice-4`                                                    |
| **Status** | **Ready for PR**                                                                                           |
| **Base `main` SHA** | `2950fd5a`                                                                                          |

## Goal

Map `research_invalidation` from rule-document compliance breach/drift signals and `procedure_revised` from a deterministic registry recovery hook; wire through `applyWeeklyCaseLifecycleTick`; persist containment ↔ revision transitions during `advanceWeek`.

## Prerequisite (on `main` @ `2950fd5a`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Lifecycle graph      | `src/domain/caseLifecycleStateMachine.ts` (SPE-2409 / PR #2687)        |
| Stage persistence    | `CaseInstance.lifecycleStage` hydrate (SPE-2410 / PR #2689)            |
| Slice 3 tick         | `applyWeeklyCaseLifecycleTick` intake + extranormal mappings (SPE-2411 / PR #2690) |
| Compliance weekly tick | `applyWeeklyRuleDocumentComplianceTick` (SPE-2366 / PR #2601)        |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `research_invalidation` from compliance drift/breach crossing        | UI surfacing                                  |
| `procedure_revised` from revision ref + compliance recovery hook     | `presumed_neutralized` disposition            |
| Explicit `documentRef` ↔ case id/templateId linkage only             | Policy-tier upgrade on adaptation             |
| `advanceWeek` lifecycle tick after compliance-decay tick           | Legacy `CaseStatus` remapping                 |
| Unit + integration tests for containment ↔ revision loop             | Slice 3 credibility/anomaly mapping changes   |
| Cases without `lifecycleStage` unchanged                             | Full SPE-1310 parent Done                     |

## Event mapping

| Lifecycle event | Weekly source | Transition |
| --- | --- | --- |
| `research_invalidation` | Linked compliance record first crosses into `drifting`/`breach` (or `drifting` → `breach`) via `applyWeeklyRuleDocumentComplianceTick` output | `containment` → `revision` |
| `procedure_revised` | Linked compliance record gains new `revision:` ref and compliance state improves | `revision` → `containment` |

Explicit linkage: `documentRef` must equal case `id` or `templateId` (no fuzzy topic overlap). Invalid events preserve the current stage.

## Acceptance

- [x] Containment case advances to `revision` when linked compliance drifts through `advanceWeek`
- [x] Revision case returns to `containment` on registry procedure-recovery hook
- [x] Cases without `lifecycleStage` remain unchanged after `advanceWeek`
- [x] Re-tick with unchanged compliance maps is idempotent
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/caseLifecycleWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/caseLifecycleWeeklyOrchestration.test.ts`, `src/test/advanceWeek.caseLifecycle.integration.test.ts` |
| Plan   | `planning/anomaly-case-lifecycle-state-machine-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| UI surfacing on mission triage / cases board | Mission triage refresh | Blocked per `ux/mission-triage.md` |
| `presumed_neutralized` disposition with surveillance clocks | SPE-1310 / SPE-921 | Parent AC; not in slice-4 graph |
| Policy-revision-on-adaptation tier upgrade transition | SPE-1310 | Adaptation trigger deferred |
| Legacy `CaseStatus` mapping / migration | SPE-1310 follow-up | Preserve mistaken records; map in dedicated slice |
| Automated compliance recovery tick (without manual state seed) | SPE-2123 follow-up | Slice 4 detects recovery when prior/next maps differ |

## Validation

- `npm run lint`
- `npm run test:run src/test/caseLifecycleWeeklyOrchestration.test.ts src/test/advanceWeek.caseLifecycle.integration.test.ts`

## See also

- `planning/anomaly-case-lifecycle-state-machine-slice-3.md`
- `planning/rule-document-compliance-containment-registry-slice-3.md`
- `src/domain/caseLifecycleStateMachine.ts`
