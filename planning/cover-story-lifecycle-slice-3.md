# SPE-1347 — Cover-story lifecycle planning mirror UI (slice 3)

One-page implementation plan. Linear: child under [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347). Follows shipped slice 2 (`planning/cover-story-lifecycle-slice-2.md`, PR #2801).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2458 — Cover-story lifecycle planning mirror UI (slice 3)](https://linear.app/spectranoir/issue/SPE-2458) |
| **Status** | **Shipped** — PR #2803 @ `747b06f3`                                                                        |
| **Parent** | [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) — Cover-story lifecycle state machine; stays **Backlog** |
| **Branch** | `spe-1347-cover-story-lifecycle-slice-3`                                                                   |
| **Base `main` SHA** | `8d6a746e`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `coverStoryRecords` and `coverStoryWeeklyProjectionSnapshots` — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `8d6a746e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/coverStoryLifecycleRegistry.ts` (SPE-1347 slice 1 / PR #2799) |
| Persistence          | `coverStoryRecords` on `GameState` (SPE-2457 / PR #2801)               |
| Weekly orchestration | `applyWeeklyCoverStoryTick` (SPE-2457 / PR #2801)                        |
| Sibling mirror template | `TruthLayerMirrorPage` (SPE-1343 slice 4 / PR #2777)                  |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getCoverStoryMirrorView` + `CoverStoryMirrorPage`               | New persistence fields                     |
| Route `/cover-story-records` + Front Desk quick link               | Weekly tick / sanitize contract changes       |
| Lifecycle projection + contradiction channel hints display         | SPE-1347 parent status changes               |
| Ops flags + weekly snapshot column from persisted snapshots        | SPE-861 disclosure UI                         |
| View + component tests                                             | Full contradiction engine                   |
| Slice doc (this file) + backlog handoff                            | Mission triage expansion                      |
|                                                                    | Record mutation from mirror surface           |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Lifecycle projection** — `projectCoverStoryLifecycleView` derives stress/collapse/repair signals without revealing hidden operational truth.
- **Contradiction hints** — channel kinds and aggregate pressure only; no hidden truth leakage in mirror labels.
- **Weekly snapshot** — column from persisted `coverStoryWeeklyProjectionSnapshots`; snapshot week vs game week displayed separately.
- **Empty state** — when `coverStoryRecords` map is empty after hydrate.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `coverStoryRecords` map renders empty state without throw
- [x] Records table shows lifecycle projection from `projectCoverStoryLifecycleView`
- [x] Ops flags and weekly snapshot display persisted projection without hidden truth leakage
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/coverStoryMirrorView.ts`                     |
| UI     | `src/features/operations/CoverStoryMirrorPage.tsx`                    |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/coverStoryMirrorView.test.ts`, `src/features/operations/CoverStoryMirrorPage.test.tsx` |
| Plan   | `planning/cover-story-lifecycle-slice-3.md`, `planning/backlog.md`    |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full contradiction accumulation engine across channels | SPE-1347 follow-up | Requires trigger sources beyond projection snapshots |
| Disclosure campaign player UI | SPE-861 | Out of domain wire-up boundary |
| Witness normalization wire-up | SPE-899 | Sibling deferred work |

## See also

- `planning/cover-story-lifecycle-slice-2.md`
- `planning/truth-layer-record-registry-slice-4.md` — mirror UI template (SPE-1343 slice 4)
