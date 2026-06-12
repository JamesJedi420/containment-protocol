# SPE-1343 — Cover narrative + agency operational record dual-incident pairing (slice 1)

One-page implementation plan. Linear: child under [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) (owners [SPE-899](https://linear.app/spectranoir/issue/SPE-899) / [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347)). Follows shipped slice 4 (`planning/truth-layer-record-registry-slice-4.md`, PR #2777).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | Cover narrative + agency operational record dual-incident pairing (slice 1) — child under SPE-1343       |
| **Status** | **Shipped** — PR #2778 @ `fe3fbae1`                                                                        |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Public myth / operational truth split          |
| **Branch** | `spe-1343-truth-layer-cover-narrative-pairing-slice-1`                                                     |
| **Base `main` SHA** | `cb53f843`                                                                                          |

## Goal

Wire at least one incident that maintains a public cover narrative alongside a separate agency operational record using persisted `truthLayerRecords` + disclosure registry refs — satisfying parent AC row 4 partial gap deferred from registry slices 3–4.

## Prerequisite (on `main` @ `cb53f843`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/truthLayerRecordRegistry.ts` (SPE-2447 / PR #2772)         |
| Persistence          | `truthLayerRecords` on `GameState` (SPE-2448 / PR #2774)               |
| Weekly orchestration | `applyWeeklyTruthLayerTick` (SPE-2449 / PR #2776)                      |
| Planning mirror UI   | `TruthLayerMirrorPage` (SPE-1343 slice 4 / PR #2777)                   |
| Disclosure fixture   | `DISCLOSURE_PROGRESSION_FIXTURE` in `publicDisclosureStateRegistry.ts` |
| Parent incident refs | `COMPETING_TRUTH_LAYERS_FIXTURE` `competingLayers` + `linkedDisclosureRef` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `COVER_NARRATIVE_TRUTH_LAYER_FIXTURE` + `AGENCY_OPERATIONAL_TRUTH_LAYER_FIXTURE` | New mirror UI                     |
| `COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES` map   | Mission triage expansion                      |
| `resolveTruthLayerDualIncidentPairing` + competing-layer resolver  | `advanceWeek` orchestration contract changes  |
| Disclosure cross-ref via `linkedDisclosureRef`                     | SPE-1464 substrate changes                    |
| Domain fixture pairing + hydrate round-trip tests                  | SPE-1343 parent status changes                |
| Slice doc (this file) + backlog handoff                            | Cover-story lifecycle state machine (SPE-1347)|

## Pairing contract

- **Hydrated truth only** — resolve from persisted map entries; null when ref or target missing.
- **Separate layers** — cover narrative `claim` stays `public_cover`; agency operational `verification` stays `verified` with `evidenceRef`; do not collapse claim/verification.
- **Sibling refs** — parent `competingLayers` resolves to `cover_narrative` and `operational_record` records by `recordRef`.
- **Disclosure hook** — `linkedDisclosureRef` resolves against `publicDisclosureRecords` when provided.
- **Empty map no-op** — missing siblings return null without throw.
- **Copy** — CP-neutral labels; no franchise tokens.

## Acceptance

- [x] Cover narrative and agency operational fixtures validate independently
- [x] Parent incident resolves both siblings + linked disclosure from fixture map
- [x] Cover claim narrative differs from agency operational verification narrative
- [x] Review projection preserves separate claim/doctrine/verification on each record
- [x] Empty truth-layer map returns null siblings without throw
- [x] Dual-incident fixture map round-trips through save/load and hydrate
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/truthLayerRecordRegistry.ts`, `src/domain/truthLayerCoverNarrativePairing.ts` |
| Tests  | `src/test/truthLayerCoverNarrativePairing.test.ts`                    |
| Plan   | `planning/truth-layer-cover-narrative-pairing-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Historical-icon normalcy pressure surfaces | SPE-1343 follow-up slice 1 | Parent AC row 5 — **shipped** PR #2779 |
| Cover-story lifecycle state machine | SPE-1347 | Out of registry pairing boundary |
| Witness normalization wire-up | SPE-899 | Out of fixture pairing boundary |
| Disclosure campaign player UI | SPE-861 | Out of domain wire-up boundary |

## See also

- `planning/truth-layer-record-registry-slice-4.md`
- `planning/spe-1343-parent-acceptance-review-slice-2.md` — AC row 4 partial evidence
