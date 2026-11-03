# SPE-1882 — Coercive protocol routine force authorization contradiction check (slice 6)

One-page implementation plan. Linear: [SPE-2425](https://linear.app/spectranoir/issue/SPE-2425) (child under [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882)). Design anchor: [SPE-1897+](https://linear.app/spectranoir/issue/SPE-1897) contradiction-check sibling cluster. Follows shipped slice 5 (`planning/coercive-contained-person-protocol-model-slice-5.md`, PR #2717 / [SPE-2424](https://linear.app/spectranoir/issue/SPE-2424)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2425 — Coercive protocol routine force authorization contradiction check (slice 6)](https://linear.app/spectranoir/issue/SPE-2425) |
| **Status** | **Shipped** — PR #2719 @ `2110a497`                                                                        |
| **Parent** | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) — registry anchor (slice 1–5 shipped)          |
| **Branch** | `spe-1897-routine-force-contradiction-check-slice-6`                                                       |
| **Base `main` SHA** | `4f3dbc81`                                                                                          |

## Goal

Implement the first deterministic contradiction-check sibling for the `routine_force_authorization` registry flag — warning-only review output that distinguishes operational-default force from emergency-only authorization without blocking procedures.

## Prerequisite (on `main` @ `4f3dbc81`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Protocol registry    | `src/domain/coerciveContainedPersonProtocolRegistry.ts` (SPE-2420)     |
| Persistence          | `coerciveContainedPersonProtocolRecords` on `GameState` (SPE-2421)     |
| Weekly orchestration | `applyWeeklyCoerciveProtocolTick` + snapshots (SPE-2422 / SPE-2424)    |
| Mirror UI            | `coerciveContainedPersonProtocolMirrorView` (SPE-2423)                 |

## Sibling contract (slice 6)

- **Flag** — `routine_force_authorization` from `collectContradictionRiskFlags` (`forcePolicy === 'routine_default'`).
- **Function** — `evaluateRoutineForceAuthorizationContradictionCheck(record)` returns structured warning-only issues.
- **Aggregator** — `evaluateCoerciveProtocolContradictionChecks(record)` returns triggered siblings in deterministic flag order (routine force only this slice).
- **Blocking** — `blocksProcedure` is always `false` per registry contract.
- **Metadata** — redacted/unknown field propagation on check results.
- **No parallel system** — siblings live in registry; risk-review flags remain sourced from `collectContradictionRiskFlags`.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Routine-force contradiction-check types + evaluator in registry    | Mirror UI module changes                      |
| `evaluateCoerciveProtocolContradictionChecks` aggregator stub      | Welfare-debt accounting math                    |
| Targeted registry unit tests                                       | Snapshot field contract changes               |
| Slice 1–5 orchestration/persistence/advanceWeek regression         | Remaining flag siblings (SPE-1907 / SPE-1898 / SPE-1908) |
| Slice doc (this file)                                              | SPE-1882 parent reopen                        |
|                                                                    | Faction ethics links (SPE-1047 / SPE-1131)    |

## Acceptance

- [x] Routine-force fixture triggers sibling with sorted warning issues and `blocksProcedure: false`
- [x] Proportional/emergency force policies return non-triggered no-op sibling
- [x] Sibling trigger aligns with `routine_force_authorization` flag from `collectContradictionRiskFlags`
- [x] Redacted/unknown metadata propagates into check output
- [x] Repeated evaluation is byte-stable
- [x] Slice 1–5 regression + mirror view regression + `npm run lint` green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coerciveContainedPersonProtocolRegistry.ts`               |
| Tests  | `src/test/coerciveContainedPersonProtocolRegistry.test.ts`            |
| Plan   | `planning/coercive-contained-person-protocol-model-slice-6.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Generalized subject-fit contradiction sibling | SPE-1907 | Next registry flag sibling |
| Compliance-metric-masks-harm sibling | SPE-1898 | Out of slice 6 boundary |
| Surveillance-isolation burden sibling | SPE-1908 | Out of slice 6 boundary |
| Faction ethics + accountability matrix links | SPE-1047 / SPE-1131 | Out of registry contradiction-check boundary |
| SPE-1889 integrated health bundle compose | SPE-1889 | Out of slice 6 boundary |
| Mirror UI surfaces sibling check detail | SPE-1882 follow-up | Slice 6 is domain-only |

## See also

- `planning/coercive-contained-person-protocol-model-slice-5.md` — snapshot persistence origin
- `planning/coercive-contained-person-protocol-model-slice-1.md` — flag + risk-review contract origin
