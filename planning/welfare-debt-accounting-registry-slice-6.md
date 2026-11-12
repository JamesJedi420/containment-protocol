# SPE-1888 — Privilege-deprivation / personnel-sourcing welfare-debt creation (slice 6)

One-page implementation plan. Linear: [SPE-2418](https://linear.app/spectranoir/issue/SPE-2418) (child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888)). Follows shipped slice 5 (`planning/welfare-debt-accounting-registry-slice-5.md`, PR #2703).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2418 — Privilege-deprivation / personnel-sourcing welfare-debt creation (slice 6)](https://linear.app/spectranoir/issue/SPE-2418) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — parent stays **Backlog** until remaining AC gaps close |
| **Branch** | `spe-1888-privilege-deprivation-personnel-sourcing-welfare-debt-slice-6`                                   |
| **Base `main` SHA** | `419755f3`                                                                                          |

## Goal

Extend slice 5 coercive procedure welfare-debt creation with privilege-deprivation and high-risk personnel-sourcing anchors — reuse `applyCoerciveProcedureWelfareDebtCreationTick`; no new ledger.

## Prerequisite (on `main` @ `419755f3`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Coercive procedure creation hook | `coerciveProcedureRegistry.ts`, `coerciveProcedureWelfareDebtCreation.ts` (SPE-2417 / PR #2703) |
| Weekly orchestration | `applyWeeklyWelfareDebtAccountingTick` in `advanceWeek` (SPE-2352)     |
| Custody / regimen registries | `containedPersonCustodyStatusRegistry.ts`, `containedPersonMedicationRegimenRegistry.ts` |

## Creation hook contract (slice 6)

- **Privilege-deprivation anchor** — `PRIVILEGE_SUSPENSION_ENFORCEMENT_ANCHOR` with `debtCategory: privilege_deprivation`; derive from custody `restrictionLevel: privilege_suspended` escalation (distinct from restraint `elevated`).
- **Personnel-sourcing anchor** — `COERCED_HIGH_RISK_PERSONNEL_SOURCING_ANCHOR` with `debtCategory: high_risk_personnel_sourcing`; derive from authored regimen + custody combo with matching `subjectRef`.
- **Legitimacy cost separate from operational success** — high `containmentBenefitScore` does not suppress debt creation.
- **Severity classification** — `privilege_deprivation` moderate base; `high_risk_personnel_sourcing` high base + high coercion pressure.
- **Idempotent creation** — stable `executionKey` per procedure instance; re-tick is a no-op; slice 5 fixtures preserved.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Two new anchors + custody/regimen fixtures                         | Full SPE-1882 protocol model                  |
| Combo draft derivation + parameterized custody restriction match   | Mission triage UI                             |
| Unit + `advanceWeek` integration tests                             | Registry decay semantic changes               |
| Slice doc (this file) + backlog handoff                            | SPE-1888 parent Done                            |
|                                                                    | SPE-1889 parent closure                       |
|                                                                    | SPE-1047 / SPE-1131 ethics wiring             |

## Acceptance

- [ ] Privilege-deprivation execution with containment improvement creates validated `WelfareDebtAccountingRecord` with `privilege_deprivation` category
- [ ] Personnel-sourcing combo creates `high_risk_personnel_sourcing` debt with high severity band
- [ ] High containment benefit still creates unresolved debt (no benefit-as-erasure)
- [ ] Re-applying creation tick is idempotent; slice 1–5 authored fixtures preserved
- [ ] `advanceWeek` integration creates debt from new anchors
- [ ] `npm run lint` + targeted tests + slice 1–5 welfare-debt regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProcedureRegistry.ts`, `src/domain/coerciveProcedureWelfareDebtCreation.ts`, `src/domain/containedPersonCustodyStatusRegistry.ts`, `src/domain/containedPersonMedicationRegimenRegistry.ts` |
| Tests  | `src/test/coerciveProcedureWelfareDebtCreation.test.ts`, `src/test/advanceWeek.coerciveProcedureWelfareDebt.integration.test.ts` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-6.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full SPE-1882 coercive protocol model | SPE-1882 | Slice 6 uses minimal anchors only |
| Ethics / accountability matrix links | SPE-1047, SPE-1131 | Parent scope links; not registry slice |
| SPE-1888 parent Done | SPE-1888 | Slice 6 closes privilege/personnel AC; remaining parent links deferred |

## See also

- `planning/welfare-debt-accounting-registry-slice-5.md`
- `planning/spe-1888-parent-acceptance-review-slice-1.md`
