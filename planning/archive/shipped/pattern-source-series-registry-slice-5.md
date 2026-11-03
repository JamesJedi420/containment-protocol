# SPE-2110 — Pattern source series registry weekly transition surfacing (slice 5)

One-page implementation plan. Linear: [SPE-2497](https://linear.app/spectranoir/issue/SPE-2497) (child under [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110)). Follows shipped slice 4 (`planning/pattern-source-series-registry-slice-4.md`, PR #2525). §14 pass: Natural alternate #3 follow-on after SPE-2489 / SPE-2490; [SPE-75](https://linear.app/spectranoir/issue/SPE-75) parent stays **Done**.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2497 — Pattern source series registry weekly transition surfacing (slice 5)](https://linear.app/spectranoir/issue/SPE-2497) |
| **Status** | **Shipped** — PR #2914 @ `f5b91540` |
| **Parent** | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) — registry anchor (slice 1–4 shipped); parent [SPE-75](https://linear.app/spectranoir/issue/SPE-75) stays **Done** |
| **Branch** | `spe-2110-pattern-source-series-weekly-surfacing-slice-5`                                                 |
| **Base `main` SHA** | `e845a0e7`                                                                                          |

## Goal

Surface post-tick pattern source series record transitions in weekly report notes after `applyWeeklyPatternSourceSeriesIntakeTick` — processing-status and readiness-score changes with CP-neutral labels. Reuse SPE-2489/SPE-2490 weekly transition surfacing pattern; no new persistence fields.

## Prerequisite (on `main` @ `e845a0e7`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/patternSourceSeriesRegistry.ts` (SPE-2110 / PR #2431) |
| Persistence          | `patternSourceSeriesRecords` on `GameState` (SPE-2327 / PR #2521) |
| Weekly orchestration | `applyWeeklyPatternSourceSeriesIntakeTick` (SPE-2328 / PR #2523) |
| Planning mirror UI   | `patternSourceSeriesMirrorView` (SPE-2329 / PR #2525) |
| Weekly note template | `publishQueueWeeklyReportNotes.ts` (SPE-2485), `visualTriggerHazardWeeklyReportNotes.ts` (SPE-2489) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `patternSourceSeriesSurfacing.ts` transition summaries             | New persistence fields                        |
| `patternSourceSeriesWeeklyReportNotes.ts` + `ReportNoteType`       | Mirror UI changes                             |
| `advanceWeek` prior vs post-tick note wire-up                      | Mission triage chips (blocked)                |
| Unit + `advanceWeek` integration tests                             | SPE-75 / SPE-2110 parent reopen               |
| Slice doc (this file) + backlog handoff                            | Additional publish channels                   |

## Surfacing contract

- **Read-only compose** — compare pre-tick vs post-tick hydrated records; no mirror or tick contract changes.
- **Emit on change only** — `processingStatus` or `readinessScore` change during the tick.
- **Empty map** — no-op; zero notes; no throw.
- **Idempotent re-tick** — unchanged records emit no new notes at the same week.
- **Safe labels** — record title + formatted enum labels; no franchise tokens.
- **Weekly note type** — `pattern_source_series.weekly_transition`.

## Acceptance

- [x] Empty `patternSourceSeriesRecords` map emits no weekly transition notes
- [x] Readiness-gated pipeline advance fixtures emit typed notes after `advanceWeek`
- [x] Idempotent re-tick at same week emits no duplicate transition notes
- [x] Terminal reconciled fixture emits no transition notes
- [x] `REPORT_NOTE_TYPES` aligned with audit registry
- [x] `npm run lint` + targeted tests green (CI)

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/patternSourceSeriesSurfacing.ts`, `src/domain/patternSourceSeriesWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| View   | `src/features/report/reportNoteView.ts`                               |
| Tests  | `src/test/patternSourceSeriesSurfacing.test.ts`, `src/test/advanceWeek.patternSourceSeries.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts` |
| Plan   | `planning/pattern-source-series-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Automated article-level queue generation | SPE-2110 child | Parent deferred; not slice 5 |
| Wire-up to Linear MCP workflow | SPE-2110 child | Parent deferred; not slice 5 |
| Mission triage pattern-source chips | Backlog | Mission triage full refresh blocked |
| Additional publish channels beyond pr-merge | SPE-75 child | Explicitly deferred across SPE-2495/2496 |
| SPE-2110 parent Done | SPE-2110 | Slice 5 is weekly surfacing only |

## See also

- `planning/pattern-source-series-registry-slice-4.md`
- `planning/visual-trigger-hazard-registry-slice-5.md`
- `planning/entity-welfare-reclassification-registry-slice-5.md`
- `planning/publish-queue-surfacing-slice-1.md`
