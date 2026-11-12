# SPE-1882 — Coercive protocol generalized subject-fit contradiction check (slice 7)

One-page implementation plan. Linear: [SPE-2426](https://linear.app/spectranoir/issue/SPE-2426) (child under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)). Design anchor: [SPE-1907](https://linear.app/spectranoir/issue/SPE-1907) contradiction-check sibling cluster. Follows shipped slice 6 (`planning/coercive-contained-person-protocol-model-slice-6.md`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2426 — Coercive protocol generalized subject-fit contradiction check (slice 7)](https://linear.app/spectranoir/issue/SPE-2426) |
| **Status** | **Shipped** — PR #2721 @ `3829da87`                                                                        |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–6 shipped)          |
| **Branch** | `spe-1907-generalized-subject-fit-contradiction-check-slice-7`                                             |
| **Base `main` SHA** | `52688ee1`                                                                                          |

## Goal

Implement the second deterministic contradiction-check sibling for the `generalized_procedure_without_subject_fit` registry flag — warning-only review output that distinguishes generalized procedure scaling without subject-fit validation from validated reuse.

## Prerequisite (on `main` @ `52688ee1`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Persistence          | `coerciveContainedPersonProtocolRecords` on `GameState` (SPE-2421)     |
| Weekly orchestration | `applyWeeklyCoerciveProtocolTick` + snapshots (SPE-2422 / SPE-2424)    |
| Mirror UI            | `coerciveContainedPersonProtocolMirrorView` (SPE-2423)                 |
| Routine-force sibling | `evaluateRoutineForceAuthorizationContradictionCheck` (SPE-2425 slice 6) |

## Sibling contract (slice 7)

- **Flag** — `generalized_procedure_without_subject_fit` from `collectContradictionRiskFlags` (`subjectFitState === 'generalized'` without `subjectFitValidationRef`).
- **Function** — `evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck(record)` returns structured warning-only issues.
- **Aggregator** — `evaluateCoerciveProtocolContradictionChecks(record)` returns triggered siblings in deterministic flag locale order (generalized subject-fit, then routine force).
- **Blocking** — `blocksProcedure` is always `false` per registry contract.
- **Metadata** — redacted/unknown field propagation on check results.
- **No parallel system** — siblings live in registry; risk-review flags remain sourced from `collectContradictionRiskFlags`.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Generalized-subject-fit contradiction-check types + evaluator      | Mirror UI module changes                      |
| `evaluateCoerciveProtocolContradictionChecks` aggregator extension | Welfare-debt accounting math                    |
| Targeted registry unit tests                                       | Snapshot field contract changes               |
| Slice 1–6 orchestration/persistence/advanceWeek regression         | Remaining flag siblings (SPE-1898 / SPE-1908) |
| Slice doc (this file)                                              | SPE-1882 parent reopen                        |
|                                                                    | Faction ethics links (SPE-1047 / SPE-1131)    |

## Acceptance

- [x] Generalized-subject-fit fixture triggers sibling with sorted warning issues and `blocksProcedure: false`
- [x] Validated subject-fit or present validation ref returns non-triggered no-op sibling
- [x] Sibling trigger aligns with `generalized_procedure_without_subject_fit` flag from `collectContradictionRiskFlags`
- [x] Redacted/unknown metadata propagates into check output
- [x] Aggregator returns both triggered siblings in flag locale order for dual-flag fixture
- [x] Repeated evaluation is byte-stable
- [x] Slice 1–6 regression + mirror view regression + `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolRegistry.ts`               |
| Tests  | `src/test/coerciveContainedPersonProtocolRegistry.test.ts`            |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-7.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Compliance-metric-masks-harm sibling | SPE-1898 | Out of slice 7 boundary |
| Surveillance-isolation burden sibling | SPE-1908 | Out of slice 7 boundary |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of registry contradiction-check boundary |
| SPE-1889 integrated health bundle compose | SPE-1889 | Out of slice 7 boundary |
| Mirror UI surfaces sibling check detail | SPE-1882 follow-up | Slice 7 is domain-only |

## See also

- `planning/coercive-contained-person-protocol-model-slice-6.md` — routine-force sibling origin
- `planning/coercive-contained-person-protocol-model-slice-1.md` — flag + risk-review contract origin
