# SPE-2123 — Rule-document compliance containment registry weekly compliance-decay advance hook (slice 3)

One-page implementation plan. Linear: child [SPE-2366](https://linear.app/spectranoir/issue/SPE-2366) under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) / anchor [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123). Follows shipped slice 2 (`planning/rule-document-compliance-containment-registry-slice-2.md`, PR #2599).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2366 — Rule-document compliance containment registry weekly compliance-decay advance hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2366) |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Case / facility lifecycle (stays open)         |
| **Anchor** | [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) — Rule-document compliance containment registry  |
| **Branch** | `spe-2123-rule-document-compliance-weekly-hook-slice-3`                                                    |
| **Base `main` SHA** | `f6423cf4`                                                                                          |

## Goal

Wire persisted `ruleDocumentComplianceRecords` into `advanceWeek` so weekly simulation ticks apply `projectComplianceDecay` forecast semantics and advance `complianceState` deterministically when drift bands warrant bounded transitions.

## Prerequisite (on `main` @ `f6423cf4`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/ruleDocumentComplianceContainmentRegistry.ts` (SPE-2123 / PR #2442) |
| Persistence          | `ruleDocumentComplianceRecords` on `GameState` (SPE-2365 / PR #2599)       |
| Sibling weekly hooks | `recurrentCatastropheWeeklyOrchestration.ts` (SPE-2364), `unexplainedLocationWeeklyLifecycle.ts` (SPE-2317) |

## Orchestration tick contract (slice 3)

- **Projection input** = `projectComplianceDecay(record, { currentWeek: week })` at the post-increment simulation week.
- **Redacted / null drift band** → record unchanged (no implicit state inference).
- **`breach` state** → terminal; drift probability already 1; no further mutation.
- **Decay band → state target** (one bounded step per tick; idempotent re-apply at same week):
  - `stable` → no change
  - `elevated` → `compliant` or `unknown` becomes `drifting`
  - `critical` → `breach` when `breachConsequence` is declared (from any non-breach state); else `compliant` or `unknown` becomes `drifting`
- `projectComplianceDecay` remains projection-only for reads; the tick does not consult other projection fields for mutation decisions.
- `validateRuleDocumentComplianceRecord` gates any mutated record; invalid candidates return the prior record unchanged.
- Warnings-only records (e.g. `compelled_binding_without_auditor`) still tick when band warrants.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyRuleDocumentComplianceTick` in domain module               | New persistence fields, UI, report notes      |
| `resolveTargetComplianceStateFromDecayBand` / projection helper for tests | SPE-1310 parent closure                       |
| Call from `advanceWeek` after week increment (`result.week`)       | SPE-1097 authority/legitimacy wire-up          |
| Targeted domain + `advanceWeek` integration tests                    | Slice-1 validation semantic changes           |
| Slice doc (this file) + backlog handoff on ship                      | Sanitize/hydration changes                    |

## Acceptance

- [ ] Empty `ruleDocumentComplianceRecords` map is a no-op without throw
- [ ] Records unchanged while projected decay band is `stable`
- [ ] `elevated` band advances `compliant` / `unknown` to `drifting`
- [ ] `critical` band advances to `breach` when `breachConsequence` is declared
- [ ] `breach` records and redacted projection inputs byte-stable through tick
- [ ] Warnings-only records still tick when band warrants
- [ ] Re-applying tick after advance is idempotent for the same week
- [ ] Invalid post-mutation records revert to prior record
- [ ] `npm run lint` + targeted tests + slice-1/2 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/ruleDocumentComplianceWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/ruleDocumentComplianceWeeklyOrchestration.test.ts`, `src/test/advanceWeek.ruleDocumentCompliance.integration.test.ts` |
| Plan   | `planning/rule-document-compliance-containment-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 follow-up | Out of weekly-hook boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Case lifecycle transitions on compliance breach | SPE-1310 | Decay-band advance only in slice 3 |

## See also

- `planning/rule-document-compliance-containment-registry-slice-2.md`
- `planning/recurrent-catastrophe-amelioration-registry-slice-3.md`
- `planning/unexplained-location-registry-slice-3.md`
