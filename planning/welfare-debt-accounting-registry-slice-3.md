# SPE-1888 — Welfare-debt accounting registry weekly orchestration hook (slice 3)

One-page implementation plan. Linear: [SPE-2352](https://linear.app/spectranoir/issue/SPE-2352) (child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888)). Follows shipped slice 2 (`planning/welfare-debt-accounting-registry-slice-2.md`, PR #2570).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2352 — Welfare-debt accounting registry weekly orchestration hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2352) |
| **Status** | **In progress** — branch `spe-1888-welfare-debt-accounting-weekly-tick-slice-3`                            |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — welfare-debt accounting umbrella stays open    |
| **Branch** | `spe-1888-welfare-debt-accounting-weekly-tick-slice-3`                                                     |
| **Base `main` SHA** | `368e9b3a`                                                                                          |

## Goal

Wire persisted `welfareDebtAccountingRecords` into `advanceWeek` with a pure domain tick: deterministic mitigation-state transitions and severity drift derived from coercive-procedure category inputs.

## Prerequisite (on `main` @ `368e9b3a`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/welfareDebtAccountingRegistry.ts` (SPE-1888 slice 1 / SPE-2350 / PR #2568) |
| Persistence          | `welfareDebtAccountingRecords` on `GameState` (SPE-1888 slice 1 / PR #2568) |
| Mirror UI            | `welfareDebtAccountingMirrorView` (SPE-2351 / PR #2570)                |
| Sibling weekly hooks | `containedPersonTherapeuticCareWeeklyOrchestration.ts` (SPE-2343), `entityWelfareReclassificationWeeklyOrchestration.ts` (SPE-2340) |

## Orchestration tick contract (slice 3)

- **Review cadence due week** — high-pressure categories (`harmful_restraint`, `coerced_medication`, `punitive_handling`, `high_risk_personnel_sourcing`): every week; medium-pressure (`forced_isolation`, `coercive_interview`, `privilege_deprivation`): even weeks; `coerced_participation`: every fourth week.
- **Acknowledgment step** — on due week, `unresolved` → `acknowledged` when `reviewOwnerLabel` is present.
- **Legitimacy escalation step** — on due week, `acknowledged` → `escalated` when category is high-pressure and `containmentBenefitScore < 0.55` (or undefined with high/critical severity).
- **Severity drift step** — on due week, escalate `severityBand` one ladder step for non-terminal records when category is high- or medium-pressure and containment benefit is below threshold (or undefined with high/critical severity); `critical` is terminal on the ladder.
- **One composite step per week** — at most one bounded mutation pass per record per tick; re-tick same week is idempotent.
- **Terminal immutability** — `mitigated`, `waived`, and `denied` records never mutate.
- **No-op** — empty map, non-due weeks, terminal/synced records, or invalid post-tick candidate (validation failure preserves source record).

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyWelfareDebtAccountingTick` in registry module          | New persistence fields, UI                    |
| Call from `advanceWeek` after therapeutic care tick, before bundle compose | Integrated health bundle compose changes |
| Targeted domain + `advanceWeek` integration tests                  | Sanitize/hydration changes (slice 1)          |
| Slice doc (this file) + backlog handoff                            | SPE-1888 parent Done                            |

## Acceptance

- [x] Empty `welfareDebtAccountingRecords` map is a no-op without throw
- [x] High-pressure unresolved debt acknowledges on review due weeks; low-benefit debt escalates and drifts severity
- [x] High-benefit restraint ledger fixture acknowledges without escalation
- [x] Medium-pressure records unchanged on non-due weeks
- [x] Re-applying tick after advance is idempotent for the same week
- [x] Invalid post-tick record must not mutate source record
- [x] Terminal states and synced escalated fixtures byte-stable when no transition applies
- [x] Warning-only validation records survive tick
- [x] `npm run lint` + targeted tests + slice 1/2 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingRegistry.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/welfareDebtAccountingWeeklyOrchestration.test.ts`, `src/test/advanceWeek.welfareDebtAccounting.integration.test.ts` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Ledger summary audit output | SPE-1888 follow-up | Out of weekly-hook boundary |
| Coercive protocol wire-up | SPE-1882 | Parent umbrella; out of weekly-hook boundary |
| SPE-1888 parent Done | SPE-1888 | Slice 3 is registry orchestration only |

## See also

- `planning/welfare-debt-accounting-registry-slice-2.md`
- `planning/contained-person-therapeutic-care-registry-slice-3.md`
- `planning/entity-welfare-reclassification-registry-slice-3.md`
