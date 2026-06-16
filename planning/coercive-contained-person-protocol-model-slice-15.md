# SPE-1882 — Canonical abusive-surveillance fixture compromised-care realignment (slice 15)

One-page implementation plan. Linear: SPE-1882 slice 15 child (create on merge). Deferred from slice 14 (`planning/coercive-contained-person-protocol-model-slice-14.md`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1882 slice 15 — Canonical abusive-surveillance fixture compromised-care realignment (create on merge) |
| **Status** | **Shipped** — PR #2841 @ `416f9260`                                                                        |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–14 shipped)           |
| **Branch** | `spe-1882-coercive-protocol-slice-15`                                                                      |
| **Base `main` SHA** | `d9932785`                                                                                          |

## Goal

Tune `ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE` so `projectContainmentCareTradeoff(record).stableContainmentDominatesCare === true` natively — no spread override in integration tests. Update surveillance-isolation contradiction-check expectations for `surveillance_isolation_masks_care_harm`; verify protocol-only welfare debt through `advanceWeek` on the canonical fixture.

## Prerequisite (on `main` @ `d9932785`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Procedure anchors    | `coercive-procedure:abusive-surveillance-isolation` (slice 14 / PR #2840) |
| Protocol debt wire-up | `resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords` (slice 13) |
| Surveillance sibling | `evaluateSurveillanceIsolationBurdenContradictionCheck` (slice 9)       |

## Anchor contract

- **Tradeoff gate** — `stableContainmentDominatesCare` when `containmentStabilityGain > careHarmAggregate` (unchanged formula).
- **Fixture tune** — raise `containmentStabilityGain` on canonical abusive-surveillance fixture only; no procedure-anchor or debt-category mapping changes.
- **Contradiction sibling** — compromised-care posture adds `surveillance_isolation_masks_care_harm` to surveillance-isolation issue list (sorted locale order).

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Fixture `containmentStabilityGain` tune                             | SPE-1888 registry reopen                    |
| Surveillance-isolation contradiction-check test expectation update  | Procedure anchors / merge precedence          |
| Welfare-debt + `advanceWeek` tests on canonical fixture (no spread) | Faction ethics (SPE-1047)                     |
| Mirror view expectation updates where fixture posture changes       | Mission triage expansion                      |
| Slice doc (this file) + backlog handoff on merge                    | Cross-system reconciliation reopen (SPE-1908) |

## Acceptance

- [x] Canonical `ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE` has `stableContainmentDominatesCare === true`
- [x] Surveillance-isolation sibling includes `surveillance_isolation_masks_care_harm` in expected issue codes
- [x] Protocol-only forced-isolation welfare debt created through `advanceWeek` without spread override
- [x] Slice 13 skip test uses explicit non-compromised-care spread (not canonical fixture)
- [x] Debt category mapping unchanged (`forced_isolation`)
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolRegistry.ts`               |
| Tests  | `src/test/coerciveContainedPersonProtocolRegistry.test.ts`, `src/test/coerciveProcedureWelfareDebtCreation.test.ts`, `src/test/advanceWeek.coerciveProtocolRecords.integration.test.ts`, `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-15.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Broader SPE-1908 cross-system reconciliation | SPE-1889 / SPE-848 / SPE-1615 | Out of slice boundary |
| Faction ethics + accountability matrix on protocol mirror | SPE-1047 / SPE-1131 | Out of slice boundary |

## See also

- `planning/coercive-contained-person-protocol-model-slice-14.md` — deferred row origin
