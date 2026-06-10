# SPE-1882 — Coercive protocol mirror contradiction-check sibling detail (slice 10)

One-page implementation plan. Linear: [SPE-2427](https://linear.app/spectranoir/issue/SPE-2427) (child under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)). Follows shipped slice 9 (`planning/coercive-contained-person-protocol-model-slice-9.md`, PR #2723 / [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2427 — Mirror contradiction-check sibling detail (slice 10)](https://linear.app/spectranoir/issue/SPE-2427) |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–9 shipped)          |
| **Branch** | `spe-1882-mirror-contradiction-check-slice-10`                                                             |
| **Base `main` SHA** | `4e6f46fe`                                                                                          |

## Goal

Surface `evaluateCoerciveProtocolContradictionChecks` read-time output in `coerciveContainedPersonProtocolMirrorView` for records with triggered siblings — agent-routing visibility over warning-only sibling issue detail, not player-facing canon.

## Prerequisite (on `main` @ `4e6f46fe`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Persistence          | `coerciveContainedPersonProtocolRecords` on `GameState` (SPE-2421)     |
| Weekly orchestration | `applyWeeklyCoerciveProtocolTick` + snapshots (SPE-2422 / SPE-2424)    |
| Mirror UI (base)     | `coerciveContainedPersonProtocolMirrorView` (SPE-2423)                 |
| Contradiction siblings | `evaluateCoerciveProtocolContradictionChecks` aggregator (slices 6–9) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Mirror view projects triggered sibling checks + sorted issue detail | Registry evaluator logic changes              |
| Mirror page displays sibling check detail in risk-review column     | Snapshot field contract changes               |
| Targeted mirror view + page tests                                    | Welfare-debt accounting math                  |
| Slice doc (this file) + backlog handoff                              | Broader SPE-1908 cross-system reconciliation  |
|                                                                    | Faction ethics links (SPE-1047 / SPE-1131)    |

## Mirror contract

- **Read-only** — mirror calls `evaluateCoerciveProtocolContradictionChecks` at build time only; no GameState mutation.
- **Triggered only** — aggregator returns empty array when no siblings trigger; mirror omits detail rows.
- **Deterministic ordering** — sibling checks follow aggregator flag locale order; issue details follow registry sort (code, then detail).
- **Redaction** — per-check `redacted` and `unknownFields` surfaced; no hidden truth beyond registry projections.
- **No parallel system** — reuse existing mirror projection patterns from slices 1–5; risk-review flags remain from `projectCoerciveProtocolRiskReview`.

## Acceptance

- [ ] Records with triggered siblings show flag label + sorted issue detail labels
- [ ] No-trigger fixture (`EMERGENCY_SEDATION_PROTOCOL_FIXTURE`) has empty `contradictionCheckViews`
- [ ] Redacted fixture propagates per-check redaction without exposing masked fields
- [ ] Quad-flag fixture shows four siblings in flag locale order
- [ ] Mirror page renders sibling issue detail for abusive surveillance fixture
- [ ] Registry/orchestration regression unchanged
- [ ] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/coerciveContainedPersonProtocolMirrorView.ts` |
| UI     | `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.tsx` |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/coerciveContainedPersonProtocolMirrorView.test.ts`, `src/features/operations/CoerciveContainedPersonProtocolMirrorPage.test.tsx` |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-10.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Broader SPE-1908 cross-system reconciliation | SPE-1889 / SPE-848 / SPE-1615 | Out of mirror-only boundary |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of mirror UI boundary |
| Mirror reads persisted weekly snapshots instead of read-time projection | SPE-1882 follow-up | Slice 5 persists; mirror still read-time |

## See also

- `planning/coercive-contained-person-protocol-model-slice-9.md` — surveillance-isolation sibling origin
- `planning/coercive-contained-person-protocol-model-slice-4.md` — base mirror UI origin
