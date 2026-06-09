# SPE-1888 — Coercive procedure welfare-debt creation hook (slice 5)

One-page implementation plan. Linear: [SPE-2417](https://linear.app/spectranoir/issue/SPE-2417) (child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888)). Follows shipped slice 4 (`planning/welfare-debt-accounting-registry-slice-4.md`, PR #2574) and grooming [SPE-2400](https://linear.app/spectranoir/issue/SPE-2400).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2417 — Coercive procedure welfare-debt creation hook (slice 5)](https://linear.app/spectranoir/issue/SPE-2417) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — procedural debt-creation AC; parent stays **Backlog** until remaining AC gaps close |
| **Branch** | `spe-1888-coercive-procedure-welfare-debt-creation-slice-5`                                                |
| **Base `main` SHA** | `6e9ffb3d`                                                                                          |

## Goal

Deterministic hook that creates `WelfareDebtAccountingRecord` entries when a coercive procedure executes and containment or security improves — reuse registry schema + weekly tick; no new parallel ledger.

## Prerequisite (on `main` @ `6e9ffb3d`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/welfareDebtAccountingRegistry.ts` (SPE-1888 slice 1 / SPE-2350 / PR #2568) |
| Persistence          | `welfareDebtAccountingRecords` on `GameState` (SPE-1888 slice 1 / PR #2568) |
| Mirror UI            | `welfareDebtAccountingMirrorView` (SPE-2351 / PR #2570)                |
| Weekly orchestration | `applyWeeklyWelfareDebtAccountingTick` (SPE-2352 / PR #2572)             |
| Ledger summary audit | `summarizeWelfareDebtAccountingRecords` (SPE-2353 / PR #2574)           |
| Medication / custody regimens | `containedPersonMedicationRegimenRegistry.ts`, `containedPersonCustodyStatusRegistry.ts` |

## Creation hook contract (slice 5)

- **Procedure anchors** — minimal [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) refs in `coerciveProcedureRegistry.ts` (forced sedation stabilization, extended mechanical restraint).
- **Execution draft** — derive from compelled medication regimens with `containmentPurposeLabel` and elevated custody holds; require `postContainmentScore > priorContainmentScore`.
- **Legitimacy cost separate from operational success** — `containmentBenefitScore` records operational benefit; high benefit does **not** suppress debt creation.
- **Severity classification** — category base band + coercion pressure + adverse-reaction escalation; independent of benefit magnitude.
- **Idempotent creation** — stable `executionKey` per procedure instance; re-tick with same drafts is a no-op; authored fixtures preserved when ids do not collide.
- **Weekly ordering** — creation tick runs before `applyWeeklyWelfareDebtAccountingTick` in `advanceWeek`.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `coerciveProcedureRegistry.ts` + `coerciveProcedureWelfareDebtCreation.ts` | Full SPE-1882 protocol model |
| `advanceWeek` wire-up before weekly welfare-debt tick              | Mission triage UI                             |
| Unit + integration tests                                           | Registry decay semantic changes               |
| Slice doc (this file) + backlog handoff                            | SPE-1888 parent Done                            |
|                                                                    | SPE-1889 parent closure                       |
|                                                                    | Privilege-deprivation / personnel-sourcing procedural cases (follow-up) |

## Acceptance

- [ ] Coercive procedure execution with containment improvement creates validated `WelfareDebtAccountingRecord`
- [ ] Severity classification deterministic from category + coercion signals
- [ ] High containment benefit still creates unresolved debt (no benefit-as-erasure)
- [ ] Re-applying creation tick is idempotent; authored fixtures preserved
- [ ] `advanceWeek` integration creates debt from medication/custody anchors
- [ ] `npm run lint` + targeted tests + slice 1–4 audit summary regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProcedureRegistry.ts`, `src/domain/coerciveProcedureWelfareDebtCreation.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/coerciveProcedureWelfareDebtCreation.test.ts`, `src/test/advanceWeek.coerciveProcedureWelfareDebt.integration.test.ts` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full SPE-1882 coercive protocol model | SPE-1882 | Slice 5 uses minimal anchors only |
| Privilege-deprivation / coerced-risk sourcing cases | SPE-1888 follow-up | Out of smallest hook boundary |
| Ethics / accountability matrix links | SPE-1047, SPE-1131 | Parent scope links; not registry slice |
| SPE-1888 parent Done | SPE-1888 | Slice 5 closes primary open AC from SPE-2400; remaining parent links deferred |

## See also

- `planning/welfare-debt-accounting-registry-slice-4.md`
- `planning/spe-1888-parent-acceptance-review-slice-1.md`
