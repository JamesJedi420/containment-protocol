# SPE-1908 — Parent owner-map reconciliation / harvest fold-in (hygiene)

One-page hygiene plan. Linear: [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908). Follows shipped cross-reconciliation slices 1–5 (`planning/spe-1908-cross-system-reconciliation-slice-5.md`, PR #2751 / [SPE-2440](https://linear.app/spectranoir/issue/SPE-2440)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-1908 — Contradiction check: Surveillance-isolation effect on contained-person mental state](https://linear.app/spectranoir/issue/SPE-1908) |
| **Status** | **Shipped** — owner-map reconciliation (docs/Linear only)                                                |
| **Branch** | `jamesdyedbq/spe-1908-owner-reconciliation`                                                                |
| **Base `main` SHA** | `fa049b03`                                                                                          |

## Goal

Close SPE-1908 multi-owner acceptance criteria by posting fold-in comments on every listed owner issue confirming surveillance-vs-contact separation coverage — without new compose/surfacing code (slices 1–5 already shipped).

## Prerequisite (on `main` @ `fa049b03`)

| Shipped anchor | Issue / PR |
| --- | --- |
| Surveillance-isolation contradiction-check sibling | PR #2723 / registry slice 9 |
| Cross-reconciliation compose | SPE-2428 / #2727, SPE-2430 / #2731, SPE-2436 / #2743 |
| Cross-reconciliation surfacing + weekly notes | SPE-2429 / #2729, SPE-2439 / #2749, SPE-2440 / #2751 |
| Integrated health bundle contact channels | SPE-1889 (therapeutic `channelState`, `humaneCareRiskScore`) |
| Surveillance tuning monitoring/contact scores | SPE-848 (`monitoringExceedsContact` projection) |
| Psychological resilience duty/treatment signals | SPE-1615 (compose cross-join + surfacing slice 5) |

## Owner map (SPE-1908 body AC)

| Owner | Reconciliation action |
| --- | --- |
| [SPE-1937](https://linear.app/spectranoir/issue/SPE-1937) | Fold-in: record footprint vs social-memory contact |
| [SPE-1929](https://linear.app/spectranoir/issue/SPE-1929) | Fold-in: exposure routing vs quarantine/contact branches |
| [SPE-855](https://linear.app/spectranoir/issue/SPE-855) | Fold-in: clearance gates vs humane-contact messaging |
| [SPE-1646](https://linear.app/spectranoir/issue/SPE-1646) | Fold-in: influence/surveillance surfaces vs direct contact |
| [SPE-1774](https://linear.app/spectranoir/issue/SPE-1774) | Fold-in (duplicate): memory replay observation ≠ contact |
| [SPE-1106](https://linear.app/spectranoir/issue/SPE-1106) | Fold-in: desk/surveillance duty vs field movement/contact |
| Staff-duty ([SPE-2016](https://linear.app/spectranoir/issue/SPE-2016)) | Fold-in: exclusion vs support-duty obligation separation |

## Scope (this slice)

| In | Out |
| --- | --- |
| Fold-in comments on listed owners (6-section format per `docs/harvest-fold-in-linear-comments.md`) | Compose contract changes |
| Parent SPE-1908 reconciliation status comment | New cross-reconciliation surfacing |
| Slice doc (this file) + `planning/backlog.md` handoff | Registry orchestration changes |
| SPE-1908 → Done when all owners confirmed | Re-implementing listed owners inside SPE-1908 |

## Acceptance

- [x] Fold-in posted on SPE-1937, SPE-1929, SPE-855, SPE-1646, SPE-1774, SPE-1106
- [x] Fold-in posted on staff-duty owner SPE-2016
- [x] Parent SPE-1908 reconciliation comment with owner checklist + shipped anchors
- [x] SPE-1908 marked Done on Linear
- [x] `planning/backlog.md` next-step row updated

## Shipped cross-reconciliation tension flags (reference)

From `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts`:

- Bundle: `surveillance_burden_stable_mental_state`, `surveillance_burden_no_active_contact_channel`, `surveillance_burden_low_humane_care_risk`, `monitoring_substitutes_contact_signal`
- Tuning: `surveillance_tuning_monitoring_exceeds_contact`, `surveillance_tuning_sustained_under_collateral_strain`
- Resilience: `psychological_resilience_exposure_elevated`, `psychological_resilience_duty_reliability_degraded`, `psychological_resilience_treatment_gated`

## See also

- `docs/harvest-fold-in-linear-comments.md`
- `docs/harvest-mirror-owner-map-qa.md`
- `planning/spe-1908-cross-system-reconciliation-slice-1.md` through slice 5
