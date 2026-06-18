# SPE-2110 — Pattern source series planning mirror dashboard UI (slice 4)

One-page implementation plan. Linear: [SPE-2329](https://linear.app/spectranoir/issue/SPE-2329) (child under [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110)). Deferred from slice 2 (`planning/pattern-source-series-registry-slice-2.md`, PR #2521).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2329 — Pattern source series planning mirror dashboard UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2329) |
| **Status** | **Shipped** — PR #2525 @ `7ef8f306`                                                                        |
| **Parent** | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) — registry anchor (slice 1–3 shipped); umbrella [SPE-75](https://linear.app/spectranoir/issue/SPE-75) **Done** on Linear |
| **Branch** | `spe-2110-pattern-source-series-mirror-ui-slice-4`                                                         |
| **Base `main` SHA** | `440fd6ea`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `patternSourceSeriesRecords` and `projectSeriesProcessingQueue` projection — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `440fd6ea`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/patternSourceSeriesRegistry.ts` (SPE-2110 / PR #2431)    |
| Persistence          | `patternSourceSeriesRecords` on `GameState` (SPE-2327 / PR #2521)    |
| Weekly intake hook   | `applyWeeklyPatternSourceSeriesIntakeTick` (SPE-2328 / PR #2523)     |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getPatternSourceSeriesMirrorView` + `PatternSourceSeriesMirrorPage` | New persistence fields                     |
| Route `/pattern-source-series` + Front Desk quick link             | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-75 parent Done                            |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Queue rank** — from `projectSeriesProcessingQueue` default policy; show rank separately from raw `publicationOrder` (tie-breaker only).
- **Empty state** — when `patternSourceSeriesRecords` map is empty after hydrate.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `patternSourceSeriesRecords` map renders empty state without throw
- [x] Queue section shows readiness-first rank from projection
- [x] Record table shows queue rank vs raw persisted fields
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/patternSourceSeriesMirrorView.ts`            |
| UI     | `src/features/operations/PatternSourceSeriesMirrorPage.tsx`         |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/patternSourceSeriesMirrorView.test.ts`, `src/features/operations/PatternSourceSeriesMirrorPage.test.tsx` |
| Plan   | `planning/pattern-source-series-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Agent-authored processing jumps without readiness gates | SPE-2110 follow-up | Requires MCP/agent driver contract beyond slice 4 |
| Sibling registry mirror UIs (SPE-2108 / SPE-2109) | respective owners | Out of SPE-2110 slice 4 boundary |
| Automated article-level queue generation | SPE-2110 follow-up | Mirror is read-only over persisted records |

## See also

- `planning/pattern-source-series-registry-slice-3.md`
- `planning/pattern-source-series-registry-slice-2.md`
