# SPE-1882 — Compromised-care procedural debt creation wire-up (slice 13)

One-page implementation plan. Linear: SPE-1882 slice 13 child (create on merge). Deferred from SPE-1888 parent grooming slice 7 (`planning/spe-1888-parent-acceptance-review-slice-7.md`). Follows shipped slice 12 (`planning/coercive-contained-person-protocol-model-slice-12.md`, PR #2837).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1882 slice 13 — Compromised-care procedural debt creation wire-up (create on merge)                    |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–12 shipped)           |
| **Branch** | `spe-1882-coercive-protocol-slice-13`                                                                      |
| **Base `main` SHA** | `5464c6e2`                                                                                          |

## Goal

Smallest `advanceWeek` wire-up from coercive protocol records with compromised-care posture (`stableContainmentDominatesCare`) to welfare-debt creation — reuse `coerciveProcedureWelfareDebtCreation.ts` + `welfareDebtAccountingCrossLinks.ts` procedure-ref matching; no SPE-1888 registry reopen.

## Prerequisite (on `main` @ `5464c6e2`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Care-harm tradeoff   | `projectContainmentCareTradeoff` (slice 1 / slice 3 tick)              |
| Welfare-debt creation | `coerciveProcedureWelfareDebtCreation.ts` (SPE-1888 slices 5–6)     |
| Cross-link compose   | `welfareDebtAccountingCrossLinks.ts` (slice 7–9, slice 12 inverse)   |
| Mirror cross-links   | `coerciveContainedPersonProtocolMirrorView.ts` (slice 12)              |

## Trigger contract

- **Compromised-care posture** — `projectContainmentCareTradeoff(record).stableContainmentDominatesCare === true`.
- **Procedure anchor** — `record.procedureRef` resolves via `resolveCoerciveProcedureAnchor`; `welfareDebtImpactLabel` is display-only, not a creation gate.
- **Containment improvement** — `containmentStabilityGain` > `BASELINE_INSECURITY_SCORE` (0.38).
- **Merge precedence** — regimen/custody/combo drafts win on duplicate `executionKey`; protocol path fills gaps only.
- **Idempotency** — `applyCoerciveProcedureWelfareDebtCreationTick` skips existing `welfare-debt:${executionKey}` ledger ids.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords` | SPE-1888 registry reopen                    |
| Extend `resolveCoerciveProcedureExecutionDrafts` merge + `advanceWeek` | Faction ethics (SPE-1047)                 |
| Unit + `advanceWeek` integration tests + cross-link procedure_ref assertion | Full taxonomy / handling-mode engine |
| Slice doc (this file) + backlog handoff on merge                   | Mission triage expansion                      |

## Acceptance

- [x] Protocol-only compromised-care fixture creates welfare-debt ledger entry through `advanceWeek`
- [x] Records without `stableContainmentDominatesCare` or without resolvable `procedureRef` are skipped
- [x] Regimen/custody drafts take precedence on duplicate execution keys
- [x] Quiet weeks and re-advance are no-op / idempotent for ledger creation
- [x] Mirror cross-link `procedure_ref` matches creation-tick id for wired protocol fixture
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProcedureWelfareDebtCreation.ts`                  |
| Sim    | `src/domain/sim/advanceWeek.ts`                                       |
| Tests  | `src/test/coerciveProcedureWelfareDebtCreation.test.ts`, `src/test/advanceWeek.coerciveProcedureWelfareDebt.integration.test.ts`, `src/test/advanceWeek.coerciveProtocolRecords.integration.test.ts` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-13.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Forced-isolation / staff-exclusion procedure anchors for protocol-only debt | SPE-1882 follow-up | Fixtures lack `procedureRef`; out of smallest wire-up |
| Broader SPE-1908 cross-system reconciliation | SPE-1889 / SPE-848 / SPE-1615 | Out of slice boundary |
| Faction ethics + accountability matrix on protocol mirror | SPE-1047 / SPE-1131 | Out of slice boundary |

## See also

- `planning/coercive-contained-person-protocol-model-slice-12.md` — deferred row origin
- `planning/spe-1888-parent-acceptance-review-slice-7.md` — compromised-care deferral comment
