# SPE-2016 — Staff-duty cross-reconciliation compose (slice 1)

One-page implementation plan. Linear: [SPE-2441](https://linear.app/spectranoir/issue/SPE-2441) (child under [SPE-2016](https://linear.app/spectranoir/issue/SPE-2016)). Deferred from `planning/spe-2016-staff-exclusion-contradiction-check-slice.md`.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2441 — Staff-duty cross-reconciliation compose (slice 1)](https://linear.app/spectranoir/issue/SPE-2441) |
| **Status** | **Shipped** — PR #2755 @ `2aef06ad`                                                                       |
| **Parent** | [SPE-2016](https://linear.app/spectranoir/issue/SPE-2016) — staff exclusion vs support-duty obligations    |
| **Branch** | `jamesdyedbq/spe-2016-staff-exclusion-cross-reconciliation-slice-1`                                        |
| **Base `main` SHA** | `6cdb63d8`                                                                                          |

## Goal

Extend `composeCoerciveProtocolIntegratedHealthReconciliation` to surface staff-exclusion tension flags when `staff_exclusion_support_duty` coexists with integrated-health and/or psychological-resilience cross-links — consult-only compose hook; no new persistence or owner-ledger implementation.

## Prerequisite (on `main` @ `6cdb63d8`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Staff-exclusion contradiction-check sibling | `evaluateStaffExclusionSupportDutyContradictionCheck` (SPE-2016 / PR #2753) |
| Cross-reconciliation compose | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts` (SPE-2428–2440) |
| Psychological resilience cross-join | SPE-2436 tension flags (`psychological_resilience_duty_reliability_degraded`, etc.) |
| Bundle contact-channel tension | `surveillance_burden_no_active_contact_channel` consult anchor |

## Cross-reconciliation contract (slice 1)

- **Staff-side gate** — `evaluateStaffExclusionSupportDutyContradictionCheck` triggered on hydrated protocol record; requires integrated-health bundle cross-link (`bundle !== null`). No `surveillance_isolation_burden` gate — staff-duty boundary distinct from contained-person surveillance cross-join.
- **Issue-derived flags** — `staff_exclusion_support_duty_obligation_elevated`, `staff_exclusion_exposure_risk_not_separated`, `staff_exclusion_medical_access_not_routed`, `staff_exclusion_accommodation_access_not_routed` from triggered check issues.
- **Compound cross-tensions** — `staff_exclusion_resilience_duty_reliability_cross_tension` when resilience duty degraded coexists; `staff_exclusion_bundle_no_active_contact_cross_tension` when bundle has no active therapeutic contact channel.
- **Consult-only** — reuses existing resilience/bundle tension anchors; no medical ledger, accommodation, or denial doctrine implementation.
- **Byte-stable ordering** — tension flags sorted on repeat.
- **Backward compatible** — SPE-2428–2440 compose regression unchanged when staff-exclusion flag absent.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Staff-duty tension flags in compose                                 | SPE-1908 surfacing / weekly notes             |
| `INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE`           | Medical policy ledger (SPE-2074)              |
| Targeted cross-reconciliation unit tests                           | Accommodation implementation (SPE-2005)       |
| Slice doc (this file) + `planning/backlog.md` handoff                | Institutional denial doctrine (SPE-2001)    |
|                                                                    | Medical outcome audit (SPE-2003)              |

## Acceptance

- [x] `STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE` + bundle triggers staff-duty tension flags without surveillance-isolation flags
- [x] Records below staff-exclusion threshold or missing bundle return no staff-duty tension flags
- [x] Resilience duty-degraded cross-tension surfaces when operator-linked resilience coexists
- [x] Byte-stable tension-flag ordering on repeat
- [x] SPE-2428–2440 cross-reconciliation regression green
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts`, `src/domain/containedPersonIntegratedHealthBundleRegistry.ts` |
| Tests  | `src/test/coerciveProtocolIntegratedHealthCrossReconciliation.test.ts` |
| Plan   | `planning/spe-2016-cross-system-reconciliation-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Staff-duty tension surfacing in mirror / weekly notes | [SPE-1908 slice 6](spe-1908-cross-system-reconciliation-slice-6.md) | Out of compose-only boundary |
| Medical policy ledger implementation | SPE-2074 | Routed via `medicalAccessStateRef` |
| Accommodation request ledger | SPE-2005 | Routed via `accommodationAccessRef` |
| Institutional denial doctrine enforcement | SPE-2001 | Routed via `denialDoctrinePressureRef` |
| Medical outcome deviation audit | SPE-2003 | Medical access owner |

## See also

- `planning/spe-2016-staff-exclusion-contradiction-check-slice.md`
- `planning/spe-1615-psychological-resilience-registry-slice-4.md`
- `planning/spe-1908-owner-reconciliation-slice.md`
