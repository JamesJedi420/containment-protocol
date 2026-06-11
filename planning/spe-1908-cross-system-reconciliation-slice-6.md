# SPE-1908 — Staff-duty cross-reconciliation surfacing (slice 6)

One-page implementation plan. Linear: **create child** under [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908) (surfacing sibling to [SPE-2439](https://linear.app/spectranoir/issue/SPE-2439) / [SPE-2440](https://linear.app/spectranoir/issue/SPE-2440)); cross-link [SPE-2441](https://linear.app/spectranoir/issue/SPE-2441) compose follow-up under [SPE-2016](https://linear.app/spectranoir/issue/SPE-2016). Follows shipped slice 5 (`planning/spe-1908-cross-system-reconciliation-slice-5.md`, PR #2751 / [SPE-2440](https://linear.app/spectranoir/issue/SPE-2440)) and compose slice 1 (`planning/spe-2016-cross-system-reconciliation-slice-1.md`, PR #2755 / [SPE-2441](https://linear.app/spectranoir/issue/SPE-2441)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2442 — Staff-duty cross-reconciliation surfacing (slice 6)](https://linear.app/spectranoir/issue/SPE-2442) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908) — surveillance-isolation contradiction check umbrella (Done; surfacing series continues) |
| **Related**| [SPE-2441](https://linear.app/spectranoir/issue/SPE-2441) — staff-duty compose (shipped)                   |
| **Branch** | `jamesdyedbq/spe-1908-staff-exclusion-cross-reconciliation-surfacing-slice-6`                              |
| **Base `main` SHA** | `52fda7df`                                                                                          |

## Goal

Surface `composeAllCoerciveProtocolIntegratedHealthReconciliations` staff-exclusion tension flags in coercive protocol mirror and weekly report notes — read-only follow-up once SPE-2441 compose cross-join exists.

## Prerequisite (on `main` @ `52fda7df`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Staff-duty cross-reconciliation compose | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts` (SPE-2441) |
| Staff-exclusion contradiction-check sibling | `evaluateStaffExclusionSupportDutyContradictionCheck` (SPE-2016) |
| Cross-reconciliation surfacing (protocol/bundle/tuning/resilience) | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts` (SPE-2429 / SPE-2439 / SPE-2440) |
| Staff-exclusion + bundle fixtures | `STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE`, `INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE` |

## Surfacing contract (slice 6)

- **Read-only** — staff-duty flags already flow from compose when protocol + bundle maps coexist; no new GameState fields or compose args.
- **Safe labels** — tension flag tokens via `formatCrossSystemTensionFlagLabel` only; **no** contradiction-check `issue.detail` strings, burden scores, or redacted field leakage in surfacing strings.
- **Tension flags** — `staff_exclusion_support_duty_obligation_elevated`, `staff_exclusion_exposure_risk_not_separated`, `staff_exclusion_medical_access_not_routed`, `staff_exclusion_accommodation_access_not_routed`, `staff_exclusion_resilience_duty_reliability_cross_tension`, `staff_exclusion_bundle_no_active_contact_cross_tension` via existing compose when staff-exclusion protocol + bundle cross-link.
- **Segmented labels** — `STAFF_EXCLUSION_CROSS_SYSTEM_TENSION_FLAGS` set filters staff-duty flags into `staffExclusionTensionFlagLabels` (parallel to tuning/resilience segmented sets in slices 4–5).
- **Empty / absent** — no staff-duty flags when bundle missing, threshold not met, or staff-exclusion flag absent; slices 2–5 surfacing unchanged when staff-duty flags absent.
- **Mirror** — `crossSystemTensionFlagLabels` already maps all compose flags; verify staff-exclusion fixture surfaces staff-duty labels (likely **test-only** mirror touch).
- **Weekly notes** — extend note content with `Staff-duty tension flags:` segment using filtered `staffExclusionTensionFlagLabels`; main `Tension flags:` segment unchanged (all flags).
- **Byte-stable ordering** — staff-duty tension flags sorted on repeat (inherited from compose).
- **No compose changes** — SPE-2441 contracts unchanged.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts` staff-duty flag set + segmented labels + note segment | SPE-2441 compose changes |
| `coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes.ts` (pass-through only if note formatter signature changes) | Medical policy ledger (SPE-2074) |
| Mirror verification tests (`coerciveContainedPersonProtocolMirrorView`) | Accommodation implementation (SPE-2005) |
| `advanceWeek` integration test with staff-exclusion fixture | Institutional denial doctrine (SPE-2001) |
| Targeted surfacing + mirror + advanceWeek tests | Contradiction-check evaluator changes |
| Slice doc (this file) + `planning/backlog.md` handoff | SPE-1908 parent re-open |

## Acceptance

- [x] Empty / absent staff-duty maps no-op without throw; slice 2–5 regression unchanged
- [x] Mirror surfaces staff-duty tension flags for `STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE` + `INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE`
- [x] Weekly report note includes staff-duty tension segment when staff-duty flags present
- [x] Contradiction-check issue detail and unit scores do not leak in surfacing labels
- [x] `advanceWeek` integration asserts staff-duty-aware reconciliation note when fixtures coexist
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.ts`, `src/domain/coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes.ts` |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` (tests only unless segmented mirror field warranted) |
| Tests  | `src/test/coerciveProtocolIntegratedHealthCrossReconciliationSurfacing.test.ts`, `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/test/advanceWeek.coerciveProtocolIntegratedHealthReconciliation.integration.test.ts` |
| Plan   | `planning/spe-1908-cross-system-reconciliation-slice-6.md`, `planning/backlog.md` |

## Implementation sequence

1. **Linear** — create child under SPE-1908; set **In Progress**; link SPE-2441 + slice doc in body.
2. **Branch** — `git checkout main && git pull`; `git checkout -b jamesdyedbq/spe-1908-staff-exclusion-cross-reconciliation-surfacing-slice-6` @ `52fda7df`.
3. **Surfacing** — add `STAFF_EXCLUSION_CROSS_SYSTEM_TENSION_FLAGS`; extend `formatCoerciveProtocolIntegratedHealthReconciliationSummaryLabels` with `staffExclusionTensionFlagLabels`; extend `formatCoerciveProtocolIntegratedHealthReconciliationNoteContent` with staff-duty segment (pattern from slices 4–5 tuning/resilience segments).
4. **Tests** — surfacing unit tests (fixture from SPE-2441 compose tests); mirror test block; `advanceWeek` integration with staff-exclusion fixture (+ optional resilience coexistence for cross-tension flag).
5. **Pre-ship audit** — six passes; `npm run lint` + targeted tests.
6. **Ship loop** — commit, push, PR, babysit, merge, sync `main`, Linear Done.

## Risks and edge cases

| Risk | Mitigation |
| ---- | ---------- |
| Leak contradiction-check `issue.detail` in surfacing | Use `formatCrossSystemTensionFlagLabel` only; assert note/mirror strings exclude known fixture score substrings |
| Empty staff-duty when bundle missing | Reuse compose no-op behavior; assert `staffExclusionTensionFlagLabels` empty |
| Regression on slices 2–5 | Keep surveillance/resilience/tuning fixture tests green unchanged |
| Staff + surveillance flags on same subject | Use staff-exclusion fixture (no surveillance-isolation flags per SPE-2441 tests) |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Medical policy ledger cross-routing | SPE-2074 | `medicalAccessStateRef` owner |
| Accommodation request ledger | SPE-2005 | `accommodationAccessRef` owner |
| Institutional denial doctrine | SPE-2001 | `denialDoctrinePressureRef` owner |

## See also

- `planning/spe-1908-cross-system-reconciliation-slice-4.md`
- `planning/spe-1908-cross-system-reconciliation-slice-5.md`
- `planning/spe-2016-cross-system-reconciliation-slice-1.md`
- `planning/spe-2016-staff-exclusion-contradiction-check-slice.md`
