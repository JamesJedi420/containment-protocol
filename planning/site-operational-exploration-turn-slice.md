# SPE-1610 slice 1 — Site operational exploration turn clock

One-page implementation plan. Linear: child under [SPE-1610 — Free investigation versus crisis action mode](https://linear.app/spectranoir/issue/SPE-1610). Harvest traceability: batch `osr-site-exploration-metadata-165` (C1–C2).

## Goal

Add a pure domain layer so field search, breach, listen, and related actions consume discrete operational turns and raise site alert pressure on cases with an active site map.

## Non-goals

- Player UI for choosing exploration actions
- Procedural encounter tables, trap adaptation, door taxonomy (later harvest slices)
- Weekly `advanceWeek` integration (follow-up)

## Shipped (this slice)

| Area | Files |
| --- | --- |
| Action catalog + costs | `src/domain/siteOperationalExploration.ts` |
| Tests | `src/test/siteOperationalExploration.test.ts` |

## Acceptance

- [x] Turn and alert clocks are deterministic per `caseId`
- [x] Each exploration action advances turn clock by authored cost
- [x] Noisy actions raise alert clock; wandering check fires at threshold
- [x] Inactive when case lacks `mapLayer` + spatial site flags
- [x] Targeted Vitest green

## Branch

`spe-1610-site-exploration-turn-slice-1`
