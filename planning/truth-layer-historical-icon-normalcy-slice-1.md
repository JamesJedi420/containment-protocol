# SPE-1343 — Historical-icon normalcy pressure review surfaces (slice 1)

One-page implementation plan. Linear: child under [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) (create/link on merge). Follows shipped cover-narrative pairing slice 1 (`planning/truth-layer-cover-narrative-pairing-slice-1.md`, PR #2778).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | Historical-icon normalcy pressure review surfaces (slice 1) — child under SPE-1343                         |
| **Status** | **Shipped** — PR #2779 @ `c7c372da`                                                                        |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Public myth / operational truth split          |
| **Branch** | `spe-1343-truth-layer-historical-icon-normalcy-slice-1`                                                  |
| **Base `main` SHA** | `d1467e14`                                                                                          |

## Goal

Wire at least one historical-icon case preserving public myth, operational truth, and correction pressure as separate review surfaces via persisted `truthLayerRecords` + `projectTruthLayerReviewView` — satisfying parent AC row 5 partial gap deferred from registry slices 1–4 and cover-narrative pairing slice 1.

## Prerequisite (on `main` @ `d1467e14`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/truthLayerRecordRegistry.ts` (SPE-2447 / PR #2772)         |
| Persistence          | `truthLayerRecords` on `GameState` (SPE-2448 / PR #2774)               |
| Weekly orchestration | `applyWeeklyTruthLayerTick` (SPE-2449 / PR #2776)                      |
| Planning mirror UI   | `TruthLayerMirrorPage` (SPE-1343 slice 4 / PR #2777)                   |
| Cover pairing        | `truthLayerCoverNarrativePairing.ts` (PR #2778)                        |
| Review projection    | `projectTruthLayerReviewView` (slice 1)                                |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE` + sibling myth/ops fixtures | New mirror UI                     |
| `HISTORICAL_ICON_NORMALCY_TRUTH_LAYER_FIXTURES` map                  | Mission triage expansion                      |
| `public_myth` competing-layer role via existing resolver             | `advanceWeek` orchestration contract changes  |
| Domain fixture + review projection tests                           | SPE-1343 parent status changes                |
| Optional hydrate round-trip through save/load                      | Cover-story lifecycle state machine (SPE-1347)|
| Slice doc (this file) + backlog handoff                            | Coastal campus cover-narrative pairing pattern|

## Normalcy-pressure contract

- **Hydrated truth only** — resolve sibling records from persisted map entries; null when ref or target missing.
- **Separate surfaces** — public myth `claim` stays folkloric belief (`rumor`/`relayed`); operational `verification` stays `verified` with `evidenceRef`; do not collapse myth into cover narrative alone.
- **Sibling refs** — parent `competingLayers` resolves to `public_myth` and `operational_record` records by `recordRef`.
- **Correction pressure** — `correctionPressure` and `mythInfrastructureWeight` surface on review projection without collapsing claim/doctrine/verification slots.
- **Empty map no-op** — missing siblings return null without throw.
- **Copy** — CP-neutral labels; no franchise tokens; distinct from coastal research campus pairing.

## Acceptance

- [x] Historical-icon parent and public-myth / operational sibling fixtures validate independently
- [x] Parent incident resolves `public_myth` and `operational_record` siblings from fixture map
- [x] Public myth narrative differs from operational verification narrative and from cover-narrative pattern
- [x] Review projection preserves separate claim/doctrine/verification plus correction pressure on each record
- [x] Empty truth-layer map returns null siblings without throw
- [x] Historical-icon fixture map round-trips through save/load and hydrate
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/truthLayerRecordRegistry.ts`                              |
| Tests  | `src/test/truthLayerHistoricalIconNormalcy.test.ts`                   |
| Plan   | `planning/truth-layer-historical-icon-normalcy-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cover-story lifecycle state machine | SPE-1347 | Out of registry fixture boundary |
| Witness normalization wire-up | SPE-899 | Out of fixture boundary |
| Disclosure campaign player UI | SPE-861 | Out of domain wire-up boundary |
| Belief-track / knowledge-state reuse for truth layers | SPE-677 / SPE-58 | Parent constraint; wire-up in slice 2+ |

## See also

- `planning/truth-layer-cover-narrative-pairing-slice-1.md`
- `planning/spe-1343-parent-acceptance-review-slice-2.md` — AC row 5
