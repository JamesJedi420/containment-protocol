# Report week navigation (backlog #3 slice)

## Goal

Let players move between weekly after-action reports without returning to the list — improves legibility and QA for multi-week runs.

## Scope

- Pure helper: `buildReportWeekNavigation(reports, currentWeek)` → optional `previousWeek` / `nextWeek` (only when a report exists for that week)
- `ReportDetailPage`: prev/next links in the dossier header
- Copy in `REPORT_UI_TEXT`
- Tests: helper + ReportDetailPage integration

## Out of scope

- Event feed week filters (already URL-backed)
- Jump-to-week picker / timeline scrubber
- Cross-linking from case detail to arbitrary report weeks

## Acceptance

- [x] With reports for weeks 2 and 4, week 4 shows “Previous week” → week 2 only (skips missing 3)
- [x] First/last report omits unavailable direction
- [x] Single-report run shows no prev/next controls

## See also

- `planning/backlog.md` item #3
- `src/features/report/ReportPage.tsx`
