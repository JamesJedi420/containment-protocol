# SPE-1882 — Forced-isolation / staff-exclusion procedure anchors (slice 14)

One-page implementation plan. Linear: SPE-1882 slice 14 child (create on merge). Deferred from slice 13 (`planning/coercive-contained-person-protocol-model-slice-13.md`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1882 slice 14 — Forced-isolation / staff-exclusion procedure anchors (create on merge)                 |
| **Status** | **Shipped** — PR #2840 @ `df379681`                                                                        |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–13 shipped)           |
| **Branch** | `spe-1882-coercive-protocol-slice-14`                                                                      |
| **Base `main` SHA** | `f1ad8a3b`                                                                                          |

## Goal

Add minimal `coerciveProcedureRegistry` anchors and `procedureRef` on `ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE` and `STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE` so compromised-care protocol records create welfare-debt ledger entries without regimen/custody backing — reuse slice 13 `resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords` path; no SPE-1888 registry reopen.

## Prerequisite (on `main` @ `f1ad8a3b`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol-only debt wire-up | `resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords` (slice 13 / PR #2839) |
| Procedure registry   | `src/domain/coerciveProcedureRegistry.ts` (SPE-1888 slices 5–6)        |
| Cross-link compose   | `welfareDebtAccountingCrossLinks.ts` procedure_ref matching            |

## Anchor contract

- **Forced isolation** — `coercive-procedure:abusive-surveillance-isolation` → `forced_isolation` debt category; abusive handling; no regimen/custody refs.
- **Staff exclusion** — `coercive-procedure:staff-exclusion-support-duty` → `punitive_handling` debt category; abusive handling; no regimen/custody refs on anchor (protocol fixture may retain owner refs).
- **Creation gate** — `stableContainmentDominatesCare` + resolvable `procedureRef`; `welfareDebtImpactLabel` display-only.
- **Merge precedence** — regimen/custody/combo drafts win on duplicate `executionKey`; protocol path fills gaps only.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Two procedure anchors + fixture `procedureRef` fields                | SPE-1888 registry reopen                    |
| Unit tests for anchor draft derivation                               | Full taxonomy / handling-mode engine          |
| `advanceWeek` integration + cross-link `procedure_ref` assertions  | Faction ethics (SPE-1047)                     |
| Slice doc (this file) + backlog handoff on merge                     | Mission triage expansion                      |

## Acceptance

- [x] `STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE` creates welfare-debt ledger entry through `advanceWeek` (protocol-only)
- [x] Abusive surveillance fixture creates debt when in compromised-care posture (integration uses spread override; canonical fixture scores unchanged)
- [x] Anchor debt categories align with fixture `welfareDebtImpactLabel` semantics without label-as-gate
- [x] Cross-link `procedure_ref` matches creation-tick id for wired fixtures
- [x] Regimen/custody merge precedence unchanged on overlapping keys
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveProcedureRegistry.ts`, `src/domain/coerciveContainedPersonProtocolRegistry.ts` |
| Tests  | `src/test/coerciveProcedureWelfareDebtCreation.test.ts`, `src/test/advanceWeek.coerciveProtocolRecords.integration.test.ts` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-14.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Broader SPE-1908 cross-system reconciliation | SPE-1889 / SPE-848 / SPE-1615 | Out of slice boundary |
| Faction ethics + accountability matrix on protocol mirror | SPE-1047 / SPE-1131 | Out of slice boundary |
| Canonical ABUSIVE_SURVEILLANCE fixture score realignment for compromised-care | SPE-1882 follow-up | Would shift contradiction-check sibling expectations |

## See also

- `planning/coercive-contained-person-protocol-model-slice-13.md` — deferred row origin
