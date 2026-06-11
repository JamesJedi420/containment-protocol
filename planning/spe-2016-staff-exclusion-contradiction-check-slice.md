# SPE-2016 — Staff exclusion versus support-duty contradiction check

One-page implementation plan. Linear: [SPE-2016](https://linear.app/spectranoir/issue/SPE-2016) (staff-duty sibling to shipped [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908)). Design anchor: contradiction-check sibling cluster in `coerciveContainedPersonProtocolRegistry.ts`.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2016 — Contradiction check: Staff exclusion versus support-duty obligations](https://linear.app/spectranoir/issue/SPE-2016) |
| **Status** | **Shipped** — PR #2753 @ `2c168f0c`                                                                       |
| **Parent** | None (staff-duty owner; related to SPE-1908 contained-person cross-join)                                   |
| **Branch** | `jamesdyedbq/spe-2016-staff-exclusion-contradiction-check`                                                 |
| **Base `main` SHA** | `809e46a1`                                                                                          |

## Goal

Implement a bounded contradiction-check sibling for staff exclusion and support-service denial scenarios — warning-only output that separates exposure risk, support-duty obligation, medical/access state, and isolation burden; routes fixes to medical/accommodation/denial-doctrine owners without duplicating their implementations.

## Prerequisite (on `main` @ `809e46a1`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Contained-person surveillance-isolation sibling | `evaluateSurveillanceIsolationBurdenContradictionCheck` (SPE-1908 slice 9) |
| Contradiction aggregator | `evaluateCoerciveProtocolContradictionChecks` (slices 6–9)          |
| Cross-reconciliation tension flags | `psychological_resilience_duty_reliability_degraded`, `surveillance_burden_no_active_contact_channel` (consult anchors only) |
| SPE-1908 owner fold-in | Fold-in comment on SPE-2016 confirming staff-duty boundary            |

## Sibling contract

- **Flag** — `staff_exclusion_support_duty` from `collectContradictionRiskFlags` (both `staffExclusionBurdenScore` ≥ 0.65 and `supportDutyObligationScore` ≥ 0.5).
- **Function** — `evaluateStaffExclusionSupportDutyContradictionCheck(record)` returns structured warning-only issues separating exposure risk, support-duty obligation, medical/access routing, and isolation-burden substitution.
- **Aggregator** — `evaluateCoerciveProtocolContradictionChecks(record)` returns triggered siblings in deterministic flag locale order (compliance metric, generalized subject-fit, routine force, staff exclusion, surveillance isolation).
- **Blocking** — `blocksProcedure` is always `false` per registry contract.
- **Owner refs** — `medicalAccessStateRef`, `accommodationAccessRef`, `denialDoctrinePressureRef` on record only; no medical ledger or accommodation implementation in this slice.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Staff-exclusion contradiction-check types + evaluator              | SPE-1908 compose/surfacing changes            |
| Optional staff-side record fields + fixture                        | Medical policy ledger (SPE-2074)              |
| `evaluateCoerciveProtocolContradictionChecks` aggregator extension | Accommodation implementation (SPE-2005)       |
| Targeted registry unit tests                                       | Institutional denial doctrine model (SPE-2001)|
| Slice doc (this file) + `planning/backlog.md` handoff              | Medical outcome audit (SPE-2003)              |

## Acceptance

- [x] Staff-exclusion fixture triggers sibling with sorted warning issues and `blocksProcedure: false`
- [x] Records below staff-exclusion or support-duty threshold return non-triggered no-op sibling
- [x] Sibling trigger aligns with `staff_exclusion_support_duty` flag from `collectContradictionRiskFlags`
- [x] Issues separately flag exposure risk, support-duty obligation, medical/access routing, isolation-burden substitution, and denial-as-contamination reduction
- [x] Redacted/unknown metadata propagates into check output
- [x] Aggregator returns five triggered siblings in flag locale order for pent-flag fixture
- [x] Repeated evaluation is byte-stable
- [x] Existing contradiction-check sibling regression + `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolRegistry.ts`               |
| Tests  | `src/test/coerciveContainedPersonProtocolRegistry.test.ts`            |
| Plan   | `planning/spe-2016-staff-exclusion-contradiction-check-slice.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cross-reconciliation compose for staff-duty tension flags | SPE-1908 follow-up / SPE-1615 | Out of registry-only slice boundary; consult existing tension flags only |
| Medical policy ledger implementation | SPE-2074 | Routed via `medicalAccessStateRef` — not duplicated here |
| Accommodation request ledger | SPE-2005 | Routed via `accommodationAccessRef` |
| Institutional denial doctrine enforcement | SPE-2001 | Routed via `denialDoctrinePressureRef` |
| Medical outcome deviation audit | SPE-2003 | Medical access owner — not duplicated here |

## See also

- `planning/coercive-contained-person-protocol-model-slice-9.md` — contained-person surveillance-isolation sibling origin
- `planning/spe-1908-owner-reconciliation-slice.md` — SPE-2016 fold-in and owner map
