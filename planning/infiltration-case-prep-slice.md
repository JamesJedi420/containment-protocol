# SPE-521 deferred UX — Infiltration case prep panel

## Goal

Case-detail prep for covert infiltration: probe/awareness tracks, cover posture summary, and optional weekly probe action override before `advanceWeek`.

## Shipped

| Area | Files |
| --- | --- |
| Override domain | `src/domain/infiltrationProbeOverride.ts`, `CaseInstance.infiltrationWeeklyProbeActionOverride` |
| Weekly tick | `applyWeeklyInfiltrationProbeTick` prefers override → plan |
| View | `src/features/cases/infiltrationCasePrepView.ts` |
| UI | `src/features/cases/InfiltrationCasePrepPanel.tsx` |
| Page | `src/features/cases/CaseDetailPage.tsx` (above leave-behind + investigation prep) |
| Store | `setInfiltrationWeeklyProbeAction` |

## Acceptance

- In-progress hidden infiltration-tagged cases show probe %, awareness %, stage, cover role/tiers, strain notes.
- Player can select `probe_access` / `probe_route` / `cleanup` or clear to plan default.
- Next weekly tick uses override when set (tests in `infiltrationProbe.test.ts`, `infiltrationProbeOverride.test.ts`).

## See also

- `src/domain/infiltrationProbe.ts`, `src/domain/infiltrationCover.ts`
- `planning/investigation-question-case-prep-slice.md` (SPE-626 UI, merged)
