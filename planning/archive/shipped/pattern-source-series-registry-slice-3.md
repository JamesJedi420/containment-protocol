# SPE-2110 — Pattern source series registry weekly intake advance hook (slice 3)

One-page implementation plan. Linear: [SPE-2328](https://linear.app/spectranoir/issue/SPE-2328) (child under [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110)). Follows shipped slice 2 (`planning/pattern-source-series-registry-slice-2.md`, PR #2521).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2328 — Pattern source series registry weekly intake advance hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2328) |
| **Status** | **Shipped** — PR #2523 @ `37619b71`                                                                        |
| **Parent** | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) — registry anchor (slice 1–2 shipped); umbrella [SPE-75](https://linear.app/spectranoir/issue/SPE-75) stays open |
| **Branch** | `spe-2110-pattern-source-series-weekly-hook-slice-3`                                                       |
| **Base `main` SHA** | `64103720`                                                                                          |

## Goal

Wire persisted `patternSourceSeriesRecords` into `advanceWeek` so active intake records advance one processing-pipeline step per week when readiness gates pass.

## Prerequisite (on `main` @ `64103720`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/patternSourceSeriesRegistry.ts` (SPE-2110 / PR #2431)    |
| Persistence          | `patternSourceSeriesRecords` on `GameState` (SPE-2327 / PR #2521)    |
| Sibling weekly hooks | `publicDisclosureWeeklyProgression` (SPE-2326), `selfCensoringInformationWeeklyRetention` (SPE-2324) |

## Progression contract (slice 3)

No week-scheduled transition history exists (unlike SPE-2109 `transitionHistory`). Weekly intake uses a **readiness-gated processing-status pipeline step**:

- **Pipeline** — `unqueued` → `blurb_triaged` → `deep_pass` → `reconciled`.
- **Terminal (no-op)** — `reconciled`, `deferred`, `rejected`.
- **Readiness gates** — advance only when `readinessScore` meets the gate for the current status: `unqueued` ≥ 0.1, `blurb_triaged` ≥ 0.25, `deep_pass` ≥ 0.5.
- **Apply** — set `processingStatus` to the next pipeline step; append the new status to `processingHistory` when present; subtract `0.3` from `readinessScore` (floor 0) after a successful step so re-tick in the same week is idempotent.
- **One step per week** — at most one pipeline transition per record per tick; `advanceWeek` invokes the tick once per closed week.
- **Mistaken records** — skip when `processingHistory` is non-empty and its last entry ≠ `processingStatus`.
- **No-op** — empty map, terminal statuses, readiness below gate, or inconsistent history.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyPatternSourceSeriesIntakeTick` in domain module        | New persistence fields, UI                    |
| Call from `advanceWeek` after week increment (`result.week`)       | SPE-75 parent Done / planning mirror UI       |
| Targeted domain + `advanceWeek` integration tests                  | Queue projection / sanitize contract changes  |
| Slice doc (this file) + backlog handoff                            | Authored agent-driven status jumps            |

## Acceptance

- [x] Empty `patternSourceSeriesRecords` map is a no-op without throw
- [x] Active record below readiness gate unchanged on tick
- [x] When gate passes, `processingStatus` advances one pipeline step and `readinessScore` decrements
- [x] Re-applying tick after advance for same week is idempotent
- [x] Invalid post-tick record must not mutate source record
- [x] Terminal fixtures and unrelated sibling registry maps byte-stable when no step applies
- [x] `npm run lint` + targeted tests + persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/patternSourceSeriesWeeklyIntake.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/patternSourceSeriesWeeklyIntake.test.ts`, `src/test/advanceWeek.patternSourceSeries.integration.test.ts` |
| Plan   | `planning/pattern-source-series-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Agent-authored processing jumps without readiness gates | SPE-2110 follow-up | Requires MCP/agent driver contract beyond slice 3 |
| Planning mirror dashboard UI | SPE-2110 / SPE-75 | Out of weekly-hook boundary |
| Readiness rebuild / corroboration coupling | SPE-854 | Parent umbrella; out of weekly-hook boundary |

## See also

- `planning/pattern-source-series-registry-slice-2.md`
- `planning/public-disclosure-state-registry-slice-3.md`
