# SPE-1347 — Cover-story lifecycle contradiction accumulation engine (slice 4)

One-page implementation plan. Linear: child under [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347). Follows shipped slice 3 (`planning/cover-story-lifecycle-slice-3.md`, PR #2803).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | Cover-story lifecycle contradiction accumulation engine (slice 4) — child under SPE-1347                  |
| **Status** | **Shipped** — PR #2804 @ `511642a8`                                                                        |
| **Parent** | [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) — Cover-story lifecycle state machine; stays **Backlog** |
| **Branch** | `spe-1347-cover-story-lifecycle-slice-4`                                                                   |
| **Base `main` SHA** | `6cfdc83c`                                                                                          |

## Goal

Wire contradiction channel accumulation from trigger sources (witness testimony, institutional records, digital traces, etc.) into weekly tick projection updates. Extend orchestration only — no mirror UI, no SPE-861 disclosure UI, no record mutation beyond deterministic channel score updates driven by defined trigger contracts.

## Prerequisite (on `main` @ `6cfdc83c`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/coverStoryLifecycleRegistry.ts` (SPE-1347 slice 1 / PR #2799) |
| Persistence + weekly hook | `planning/cover-story-lifecycle-slice-2.md` (SPE-2457 / PR #2801) |
| Planning mirror UI   | `planning/cover-story-lifecycle-slice-3.md` (SPE-2458 / PR #2803)     |

## Orchestration contract (slice 4)

- **Trigger contracts** — `resolveWeeklyCoverStoryContradictionTriggers` maps intake contradiction events, truth-layer divergence, compliance breach, and extranormal witness monitoring onto channel kinds.
- **Accumulation** — `applyCoverStoryContradictionTriggers` upserts channel scores (0..1 clamp), idempotent on `sourceRef`.
- **Lifecycle transitions** — maintained → stressed at `0.45`; stressed → collapsed at `0.85`; invalid transitions still rejected at sanitize.
- **Weekly tick** — `applyWeeklyCoverStoryTick(records, week, snapshots, { contradictionInput })` runs accumulation then projections; orphan snapshot pruning unchanged.
- **Does not** — mirror UI changes, SPE-861 disclosure UI, SPE-899 witness normalization wire-up, SPE-1309 unified engine.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `coverStoryContradictionAccumulation.ts` trigger + tick logic      | Mirror UI changes                             |
| Extended `applyWeeklyCoverStoryTick` with `contradictionInput`     | SPE-861 disclosure UI                         |
| `advanceWeek` trigger context wire-up                              | SPE-1309 unified engine                       |
| `deriveCoverStoryContradictionPressure` export on registry         | SPE-899 witness normalization                 |
| Unit + orchestration + advanceWeek integration tests               | Record mutation beyond channel scores / lifecycle transitions |
| Slice doc (this file) + backlog handoff                            |                                               |

## Acceptance

- [x] Channel accumulation from fixture triggers with 0..1 clamping
- [x] Orchestration idempotent on same-week re-tick
- [x] advanceWeek stressed → collapsed path via linked truth-layer divergence trigger
- [x] Empty channel list / no triggers preserve byte-stable records
- [x] Projections surface channel hints and aggregate pressure only (no hidden truth leakage)
- [x] Invalid phase transitions rejected at sanitize (from slice 1)
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coverStoryContradictionAccumulation.ts`, `src/domain/coverStoryWeeklyOrchestration.ts`, `src/domain/coverStoryLifecycleRegistry.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/coverStoryContradictionAccumulation.test.ts`, `src/test/coverStoryWeeklyOrchestration.test.ts`, `src/test/advanceWeek.coverStoryRecords.integration.test.ts` |
| Plan   | `planning/cover-story-lifecycle-slice-4.md`, `planning/backlog.md`    |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Disclosure campaign player UI | SPE-861 | Out of domain wire-up |
| Witness normalization wire-up | SPE-899 | Sibling work |
| Full SPE-1347 parent closure | SPE-1347 | Parent stays open until disclosure + witness siblings land or are explicitly deferred on parent |

## See also

- `planning/cover-story-lifecycle-slice-3.md`
- `src/domain/informationIntakeWeeklyCorroboration.ts` — intake contradiction trigger pattern
- `src/domain/caseLifecycleWeeklyOrchestration.ts` — weekly trigger input pattern
