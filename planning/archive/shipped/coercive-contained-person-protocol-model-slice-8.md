# SPE-1882 — Coercive protocol compliance-metric contradiction check (slice 8)

One-page implementation plan. Linear: [SPE-1898](https://linear.app/spectranoir/issue/SPE-1898) (child under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)). Design anchor: contradiction-check sibling cluster. Follows shipped slice 7 (`planning/coercive-contained-person-protocol-model-slice-7.md`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-1898 — Contradiction check: Compliance metric versus personhood damage (slice 8)](https://linear.app/spectranoir/issue/SPE-1898) |
| **Status** | **Shipped** — PR #2722 @ `d3076377`                                                                        |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–7 shipped)          |
| **Branch** | `spe-1898-compliance-metric-contradiction-check-slice-8`                                                   |
| **Base `main` SHA** | `32308116`                                                                                          |

## Goal

Implement the third deterministic contradiction-check sibling for the `compliance_metric_masks_harm` registry flag — warning-only review output that distinguishes compliance-only success metrics from personhood and care-harm signals.

## Prerequisite (on `main` @ `32308116`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Persistence          | `coerciveContainedPersonProtocolRecords` on `GameState` (SPE-2421)     |
| Weekly orchestration | `applyWeeklyCoerciveProtocolTick` + snapshots (SPE-2422 / SPE-2424)    |
| Mirror UI            | `coerciveContainedPersonProtocolMirrorView` (SPE-2423)                 |
| Routine-force sibling | `evaluateRoutineForceAuthorizationContradictionCheck` (SPE-2425 slice 6) |
| Generalized-subject-fit sibling | `evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck` (SPE-2426 slice 7) |

## Sibling contract (slice 8)

- **Flag** — `compliance_metric_masks_harm` from `collectContradictionRiskFlags` (`complianceMetricOnly === true`).
- **Function** — `evaluateComplianceMetricMasksHarmContradictionCheck(record)` returns structured warning-only issues.
- **Aggregator** — `evaluateCoerciveProtocolContradictionChecks(record)` returns triggered siblings in deterministic flag locale order (compliance metric, generalized subject-fit, routine force).
- **Blocking** — `blocksProcedure` is always `false` per registry contract.
- **Metadata** — redacted/unknown field propagation on check results.
- **No parallel system** — siblings live in registry; risk-review flags remain sourced from `collectContradictionRiskFlags`.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Compliance-metric contradiction-check types + evaluator            | Mirror UI module changes                      |
| `evaluateCoerciveProtocolContradictionChecks` aggregator extension | Welfare-debt accounting math                    |
| Targeted registry unit tests                                       | Snapshot field contract changes               |
| Slice 1–7 orchestration/persistence/advanceWeek regression         | Remaining flag sibling (SPE-1908)             |
| Slice doc (this file)                                              | SPE-1882 parent reopen                        |
|                                                                    | Faction ethics links (SPE-1047 / SPE-1131)    |

## Acceptance

- [x] Compliance-metric fixture triggers sibling with sorted warning issues and `blocksProcedure: false`
- [x] Records without `complianceMetricOnly: true` return non-triggered no-op sibling
- [x] Sibling trigger aligns with `compliance_metric_masks_harm` flag from `collectContradictionRiskFlags`
- [x] Redacted/unknown metadata propagates into check output
- [x] Aggregator returns three triggered siblings in flag locale order for triple-flag fixture
- [x] Repeated evaluation is byte-stable
- [x] Slice 1–7 regression + mirror view regression + `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolRegistry.ts`               |
| Tests  | `src/test/coerciveContainedPersonProtocolRegistry.test.ts`            |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-8.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Surveillance-isolation burden sibling | SPE-1908 | Out of slice 8 boundary |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of registry contradiction-check boundary |
| SPE-1889 integrated health bundle compose | SPE-1889 | Out of slice 8 boundary |
| Mirror UI surfaces sibling check detail | SPE-1882 follow-up | Slice 8 is domain-only |
| Broader SPE-1898 cross-system reconciliation | SPE-861 / SPE-1743 / SPE-1670 | Out of registry-only slice boundary |

## See also

- `planning/coercive-contained-person-protocol-model-slice-7.md` — generalized-subject-fit sibling origin
- `planning/coercive-contained-person-protocol-model-slice-6.md` — routine-force sibling origin
- `planning/coercive-contained-person-protocol-model-slice-1.md` — flag + risk-review contract origin
