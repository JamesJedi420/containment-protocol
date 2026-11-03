# SPE-1347 — Cover-story lifecycle persistence + weekly orchestration (slice 2)

One-page implementation plan. Linear: child under [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347). Follows shipped registry slice 1 (`planning/cover-story-lifecycle-slice-1.md`, PR #2799).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2457 — Cover-story lifecycle GameState persistence + weekly orchestration hook (slice 2)](https://linear.app/spectranoir/issue/SPE-2457) |
| **Status** | **Shipped** — PR #2801 @ `adcb571a`                                                                        |
| **Parent** | [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) — Cover-story lifecycle state machine; stays **Backlog** |
| **Branch** | `spe-1347-cover-story-lifecycle-slice-2`                                                                   |
| **Base `main` SHA** | `18579682`                                                                                          |

## Goal

Persist validated `CoverStoryRecord` entries on `GameState` with sanitize/hydration and wire `applyWeeklyCoverStoryTick` into `advanceWeek` mirroring truth-layer and coercive-protocol weekly snapshot patterns.

## Prerequisite (on `main` @ `18579682`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/coverStoryLifecycleRegistry.ts` (SPE-1347 slice 1 / PR #2799) |
| Truth-layer persistence pattern | `planning/truth-layer-record-registry-slice-2.md` (SPE-2448)   |
| Weekly hook pattern  | `planning/truth-layer-record-registry-slice-3.md` (SPE-2449)           |
| Coercive snapshot pattern | `src/domain/coerciveContainedPersonProtocolWeeklyOrchestration.ts` |

## Orchestration contract (slice 2)

- **Lifecycle projection** — `projectCoverStoryLifecycleView(record)` derives stress/collapse/repair signals without revealing hidden operational truth.
- **Weekly tick** — `applyWeeklyCoverStoryTick(records, week, snapshots)` preserves source records byte-stable; persists `coverStoryWeeklyProjectionSnapshots` keyed by record id.
- **No-op** — empty `coverStoryRecords` map; re-tick same week is idempotent.
- **Does not** — implement full contradiction engine, extend disclosure UI, or mutate cover-story record fields.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `coverStoryRecords` on `GameState`                                  | Full contradiction engine          |
| `coverStoryWeeklyProjectionSnapshots` on `GameState` + hydrate wire | SPE-861 disclosure UI                         |
| `sanitizeCoverStoryRecords` + snapshot sanitize in `runTransfer`     | Mission triage expansion                      |
| `applyWeeklyCoverStoryTick` in `coverStoryWeeklyOrchestration.ts`  | SPE-1309 unified engine                       |
| Call from `advanceWeek` after week increment (`result.week`)         | Coercive protocol mirror changes              |
| Default `{}` in `createStartingState`                                | SPE-1347 parent Done                          |
| Save/import round-trip + advanceWeek integration tests               | Witness normalization (SPE-899)               |
| Slice doc (this file) + backlog handoff                              |                                               |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Fixture records byte-stable through `advanceWeek` tick
- [x] Empty `coverStoryRecords` map is a no-op without throw
- [x] Weekly lifecycle snapshots persist stress/collapse signals without hidden truth
- [x] Re-applying tick for same post-advance week is idempotent
- [x] Invalid phase transitions rejected at sanitize (from slice 1)
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/coverStoryLifecycleRegistry.ts`, `src/domain/coverStoryWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/coverStoryLifecycleRegistry.test.ts`, `src/test/coverStoryWeeklyOrchestration.test.ts`, `src/test/advanceWeek.coverStoryRecords.integration.test.ts` |
| Plan   | `planning/cover-story-lifecycle-slice-2.md`, `planning/backlog.md`    |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full contradiction accumulation engine across channels | SPE-1347 follow-up | Requires trigger sources beyond projection snapshots |
| Disclosure campaign player UI | SPE-861 | Out of domain wire-up boundary |
| Planning mirror UI for cover-story lifecycle review | SPE-1347 slice 3+ | Mirror follows orchestration pattern |
| Witness normalization wire-up | SPE-899 | Sibling deferred work |

## See also

- `planning/cover-story-lifecycle-slice-1.md`
- `planning/truth-layer-record-registry-slice-2.md` — persistence pattern (SPE-2448)
- `planning/truth-layer-record-registry-slice-3.md` — weekly hook pattern (SPE-2449)
