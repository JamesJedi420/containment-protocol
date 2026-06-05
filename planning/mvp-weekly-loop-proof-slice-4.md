# MVP weekly loop proof — slice 4 (partial success + institutional carryover)

## Shipped status

| Field | Value |
| --- | --- |
| **Linear (slice)** | [SPE-2310](https://linear.app/spectranoir/issue/SPE-2310) — Done |
| **Merged PR** | [#2484](https://github.com/JamesJedi420/containment-protocol/pull/2484) @ `b191ef36` |
| **Linear (parent)** | [SPE-2251](https://linear.app/spectranoir/issue/SPE-2251) — open (milestone 6 incomplete) |
| **MVP claims** | `planning/mvp-scope.md` §8 Claims 3–4 |

## Goal

Extend the SPE-2251 `weeklyMvpLoopProof` harness so one deterministic flow proves:

- **Claim 3** — partial success is a meaningful band: `partialCases` and mission snapshots show `partial`, not fail/resolve-only.
- **Claim 4** — institutional memory: budget pressure, support shortfall, and recovery posture persist through `advanceWeek` + save/load.

## Boundary

- `src/test/helpers/weeklyMvpLoopProof.ts` + `src/test/weeklyMvpLoopProof.slice4.integration.test.ts` only unless a real persistence gap appears.
- No registry waves, triage UI refresh, SPE-2250 batch-4+, or domain rule changes unless the harness exposes a gap.
- Reuse slices 1–3 fixture, intake/triage hooks, `advanceWeek`, save/load.

## Implementation

| Area | Files |
| --- | --- |
| Helper hooks | `tuneWeeklyMvpLoopCovertForPartialBand`, `applyWeeklyMvpLoopInstitutionalPressure`, `readWeeklyMvpLoopCovertMissionResult`, `collectWeeklyMvpLoopReportNotesByType` |
| Tests | `src/test/weeklyMvpLoopProof.slice4.integration.test.ts` |

## Shipped acceptance

- [x] `weeklyMvpLoopProof.slice4.integration.test.ts` in CI
- [x] Full suite green (CI test job)
- [x] PR #2484 merged; parent SPE-2251 remains open

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Claims 5–6 full surfacing / compare-top-2 triage UI | Mission triage refresh (blocked) | Out of slice — harness only |
| Milestone 6 parent closure | SPE-2251 grooming | Claims 1–4 slices may still leave report-UX gaps |

## See also

- `planning/mvp-weekly-loop-proof-slice-3.md`
- `planning/mvp-scope.md` §8
