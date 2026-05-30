# SPE-70 — Hidden-state modality matrix slice 4 (persistent recon cache)

One-page implementation plan. Linear: [SPE-2284](https://linear.app/spectranoir/issue/SPE-2284) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Follows shipped [SPE-2283](https://linear.app/spectranoir/issue/SPE-2283) (PR #2407).

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2284 — Hidden-state modality matrix slice 4](https://linear.app/spectranoir/issue/SPE-2284) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70) |
| **Branch** | `jamesdyedbq/spe-2284-hidden-modality-matrix-slice-4-recon-cache` |
| **Status** | **Shipped** — SPE-2284 / PR #2409 |

## Goal

Persist **known-but-unresolved** concealment nodes when hidden-state scouting returns partial tier readouts (fields present, layers still blocking). Carry that cache across assigned weeks so a later pass can peel one cached layer and apply a bounded route-caution score signal — satisfying SPE-70 “known-but-unresolved across scouting passes” without new scan families or UI.

## Prerequisite (on `main`)

| Shipped | Anchor |
| --- | --- |
| Modality compose | `hiddenStateModality.ts`, `resolveScoutingWithCaseHiddenState` (SPE-2281) |
| Weekly orchestration | `evaluateHiddenStateScoutingWithRevealPayload` (SPE-2282) |
| Modality report copy | `detectionScanReportNotes.ts` (SPE-2283) |

## Gap (pre-slice)

- Each week recomputes scouting scans with no memory of prior partial readouts.
- Multi-week `in_progress` cases decrement `weeksRemaining` without recording scouting passes.
- No downstream operational signal from cached unresolved nodes.

## Scope (this slice)

| In | Out |
| --- | --- |
| `HiddenStateScoutingReconCache` on `CaseInstance` | False-entity / structural-illusion lifecycle (slice 5) |
| `hiddenStateScoutingReconCache.ts` — merge, strip bonus, score hook | New event types |
| Extra `layersToStrip` in `scoutingOutcomeToDetectionScanForCase` when cache has unresolved nodes | UI components |
| Merge cache after hidden-state scouting in orchestration + in-progress weekly pass | Full SPE-70 parent closure |
| `advanceWeek` multi-week integration test | Rewriting disguise or recon modifier systems |

## Cache contract

**Record when:** hidden-state scouting produces `detectionScan.fields.length > 0` and `remainingConcealmentLayers.length > 0`.

**Store:** sorted `knownUnresolvedLayerIds`, increment `scoutingPassCount`, set `lastUpdatedWeek`.

**Apply on later pass:** if `scoutingPassCount >= 1` and unresolved ids non-empty, add `+1` to `layersToStrip` (capped, merged with counter-detection strip).

**Operational hook:** when `scoutingPassCount >= 2`, add bounded `+0.35` mission score adjustment with route-caution reason (deterministic).

## Acceptance

- [x] First partial hidden-state scan records cache on case.
- [x] Second assigned week applies extra layer strip and route-caution score signal.
- [x] Disguise-active cases skip hidden-state path; cache unchanged (orchestration regression).
- [x] `npm run lint` + targeted `npm run test:run` green.

## Branch

`jamesdyedbq/spe-2284-hidden-modality-matrix-slice-4-recon-cache`

## Out of scope (later)

- False-entity / structural-illusion lifecycle — slice 5
- Mission triage UI chips
- `concealment.activated` enrichment from cache
