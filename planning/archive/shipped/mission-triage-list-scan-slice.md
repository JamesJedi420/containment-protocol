# SPE-2259 slice 6 — Mission triage list scan polish (UX)

One-page implementation plan. Linear: [SPE-2259](https://linear.app/spectranoir/issue/SPE-2259/mission-triage-list-scan-polish-slice-6-ux). Parent: [SPE-16 — Mission Intake, Triage, & Routing](https://linear.app/spectranoir/issue/SPE-16) (Done). Follows slice 5 disposition ([planning/mission-triage-disposition-slice.md](mission-triage-disposition-slice.md)).

## Goal

On the compact `/cases` triage list, show read-only **disposition** and **marker chips** so players can scan weekly intent and covert load without opening each case detail panel.

## Non-goals

- List-row disposition actions (detail panel only)
- Full deferral compare table on every row
- New `missionRouting` fields or simulation math

## Shipped

| Area | Files |
| --- | --- |
| Chip builder | `buildMissionTriageListRowChips`, `buildMissionTriageCompactRowView` in `missionTriageLayoutView.ts` |
| List UI | `MissionTriageListRow.tsx` chip row + row `aria-label` |
| Detail reuse | `CasesPage` detail markers via same chip builder |
| Tests | `missionTriageLayoutView.test.ts`, `CasesPage.test.tsx` |

## Acceptance

- [x] Active route/defer/ignore visible as first chip on list row for current week
- [x] Urgency + covert-prep markers render as chips (max 5 per row)
- [x] Ignored cases still sort deprioritized (unchanged `triageIgnored`)
- [x] Lint + targeted Vitest green
- [x] Full `npm run test:run` green (3726 tests, post-audit)

## Branch

`spe-16-mission-triage-list-scan-slice-6`
