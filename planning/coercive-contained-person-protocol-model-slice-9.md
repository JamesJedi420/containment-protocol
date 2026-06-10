# SPE-1882 — Coercive protocol surveillance-isolation burden contradiction check (slice 9)

One-page implementation plan. Linear: [SPE-1908](https://linear.app/spectranoir/issue/SPE-1908) (registry sibling under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)). Design anchor: contradiction-check sibling cluster. Follows shipped slice 8 (`planning/coercive-contained-person-protocol-model-slice-8.md`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-1908 — Contradiction check: Surveillance-isolation burden (slice 9)](https://linear.app/spectranoir/issue/SPE-1908) |
| **Status** | **In progress**                                                                                            |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–8 shipped)          |
| **Branch** | `spe-1908-surveillance-isolation-contradiction-check-slice-9`                                              |
| **Base `main` SHA** | `f551c384`                                                                                          |

## Goal

Implement the fourth and final deterministic contradiction-check sibling for the `surveillance_isolation_burden` registry flag — warning-only review output that distinguishes elevated isolation and surveillance burden from humane contact and personhood-preservation signals.

## Prerequisite (on `main` @ `f551c384`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Persistence          | `coerciveContainedPersonProtocolRecords` on `GameState` (SPE-2421)     |
| Weekly orchestration | `applyWeeklyCoerciveProtocolTick` + snapshots (SPE-2422 / SPE-2424)    |
| Mirror UI            | `coerciveContainedPersonProtocolMirrorView` (SPE-2423)                 |
| Routine-force sibling | `evaluateRoutineForceAuthorizationContradictionCheck` (SPE-2425 slice 6) |
| Generalized-subject-fit sibling | `evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck` (SPE-2426 slice 7) |
| Compliance-metric sibling | `evaluateComplianceMetricMasksHarmContradictionCheck` (SPE-1898 slice 8) |

## Sibling contract (slice 9)

- **Flag** — `surveillance_isolation_burden` from `collectContradictionRiskFlags` (both `isolationBurdenScore` and `surveillanceBurdenScore` ≥ threshold).
- **Function** — `evaluateSurveillanceIsolationBurdenContradictionCheck(record)` returns structured warning-only issues.
- **Aggregator** — `evaluateCoerciveProtocolContradictionChecks(record)` returns triggered siblings in deterministic flag locale order (compliance metric, generalized subject-fit, routine force, surveillance isolation).
- **Blocking** — `blocksProcedure` is always `false` per registry contract.
- **Metadata** — redacted/unknown field propagation on check results.
- **No parallel system** — siblings live in registry; risk-review flags remain sourced from `collectContradictionRiskFlags`.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Surveillance-isolation contradiction-check types + evaluator       | Mirror UI module changes                      |
| `evaluateCoerciveProtocolContradictionChecks` aggregator extension   | Welfare-debt accounting math                    |
| Targeted registry unit tests                                       | Snapshot field contract changes               |
| Slice 1–8 orchestration/persistence/advanceWeek regression         | Broader SPE-1908 cross-system reconciliation  |
| Slice doc (this file)                                              | SPE-1882 parent reopen                        |
|                                                                    | Faction ethics links (SPE-1047 / SPE-1131)    |

## Acceptance

- [x] Surveillance-isolation fixture triggers sibling with sorted warning issues and `blocksProcedure: false`
- [x] Records below isolation/surveillance threshold return non-triggered no-op sibling
- [x] Sibling trigger aligns with `surveillance_isolation_burden` flag from `collectContradictionRiskFlags`
- [x] Redacted/unknown metadata propagates into check output
- [x] Aggregator returns four triggered siblings in flag locale order for quad-flag fixture
- [x] `ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE` triggers surveillance sibling without routine-force/generalized/compliance flags
- [x] Repeated evaluation is byte-stable
- [x] Slice 1–8 regression + mirror view regression + `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolRegistry.ts`               |
| Tests  | `src/test/coerciveContainedPersonProtocolRegistry.test.ts`            |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-9.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Broader SPE-1908 cross-system reconciliation (condition bundles, surveillance tuning, psychological resilience) | SPE-1889 / SPE-848 / SPE-1615 | Out of registry-only slice boundary |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of registry contradiction-check boundary |
| Mirror UI surfaces sibling check detail | SPE-1882 follow-up | Slice 9 is domain-only |
| SPE-1882 parent closure | SPE-1882 | Registry flag siblings complete; parent may have other AC |

## See also

- `planning/coercive-contained-person-protocol-model-slice-8.md` — compliance-metric sibling origin
- `planning/coercive-contained-person-protocol-model-slice-7.md` — generalized-subject-fit sibling origin
- `planning/coercive-contained-person-protocol-model-slice-6.md` — routine-force sibling origin
- `planning/coercive-contained-person-protocol-model-slice-1.md` — flag + risk-review contract origin
