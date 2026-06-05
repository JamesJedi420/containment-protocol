# MVP weekly loop proof — slice 5 (report surfacing + next-week delta)

## Shipped status

| Field | Value |
| --- | --- |
| **Linear (slice)** | [SPE-2311](https://linear.app/spectranoir/issue/SPE-2311) — **Done** (PR #2486) |
| **Linear (parent)** | [SPE-2251](https://linear.app/spectranoir/issue/SPE-2251) — **Done** (Claims 1–6 harness-backed) |
| **Branch** | `spe-2251-mvp-weekly-loop-proof-slice-5` (merged) |
| **Base `main` SHA** | `c86e4b74` |
| **Merge `main` SHA** | `80f7ffdb` |
| **MVP claims** | `planning/mvp-scope.md` §8 Claims 5–6 |

## Goal

Extend the SPE-2251 `weeklyMvpLoopProof` harness so one deterministic flow proves:

- **Claim 5** — reports and surfaces explain consequences clearly enough to learn (`reportNoteView` categories, `partialCases` rollup, case snapshot `explanationNotes`, support shortfall + intake note types, partial resolution events).
- **Claim 6** — the next week feels changed because of the prior week (institutional posture + triage deltas across `advanceWeek` and save/load; growing case-linked report weeks).

## Boundary

- `src/test/helpers/weeklyMvpLoopProof.ts` + `src/test/weeklyMvpLoopProof.slice5.integration.test.ts` only.
- No triage UI refresh, registry waves, SPE-2250 batch-4+, or domain rule changes.
- Reuse slices 1–4 fixture, intake/pressure/partial hooks, `collectWeeklyMvpLoopReportNotesByType`, save/load multi-week loop.
- Assert by note type, rollup keys (`partialCases`), and case snapshot fields — not brittle last-report ordering.

## Implementation

| Area | Files |
| --- | --- |
| Helper hooks | `findWeeklyMvpLoopReportByWeek`, `findWeeklyMvpLoopReportWithPartialOutcome`, `readWeeklyMvpLoopReportSurfacingBundle`, `readWeeklyMvpLoopInstitutionalPosture`, `compareWeeklyMvpLoopInstitutionalPosture` |
| Tests | `src/test/weeklyMvpLoopProof.slice5.integration.test.ts` |

## Acceptance

- [x] `weeklyMvpLoopProof.slice5.integration.test.ts` in CI
- [x] `npm run test:run -- src/test/weeklyMvpLoopProof` green
- [x] `npm run lint` green
- [x] PR #2486 merged; slice issue linked

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Compare-top-2 triage UI, bulk disposition | Mission triage refresh (blocked) | Out of slice — harness only |
| Playwright / Operations Report UI smoke | Future UX slice | Vitest harness satisfies Claim 5 at test granularity per slice 1 precedent |
| SPE-2251 parent Done | Grooming after merge | Only when Claims 1–6 evidence is complete |

## See also

- `planning/mvp-weekly-loop-proof-slice-4.md`
- `src/features/report/reportNoteView.ts`
- `planning/mvp-scope.md` §8
