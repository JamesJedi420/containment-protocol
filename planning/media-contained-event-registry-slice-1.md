# SPE-947 — Media-contained event registry slice 1

One-page implementation plan. Linear: [SPE-2120](https://linear.app/spectranoir/issue/SPE-2120) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) (anti-narrative record-collapse registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2120 — Media-contained event registry — playback loops and record-as-event boundaries (slice 1)](https://linear.app/spectranoir/issue/SPE-2120) |
| **Parent** | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — Hazardous content propagation |
| **Branch** | `jamesdyedbq/spe-2120-media-contained-event-registry-slice-1` |
| **Status** | **In Progress** |

## Goal

Add a pure deterministic **media-contained event registry** for recordings/files that host repeating or evolving events rather than passive archival footage, including loop-state boundaries and playback divergence.

## Prerequisite (on `main` @ `55667d11`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Visual-trigger hazards | `src/domain/visualTriggerHazardRegistry.ts` (SPE-2111) |
| Anti-narrative collapse | `src/domain/antiNarrativeRecordCollapseRegistry.ts` (SPE-2119 / PR #2438) |
| Intake registry wave | SPE-2104–SPE-2119 sibling patterns |
| Harvest batch        | `starter-picks-routing-65` (C14/C15/C30/C31) in `planning/harvest-reconciliation-index.md` |

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `MediaContainedEventId` + `MediaContainedEventRecord` in `src/domain/mediaContainedEventRegistry.ts`                             | GameState persistence                         |
| mediaKind, eventLoopState, playbackPosition, historicalDeviationFlag, custodyChainRefs, publicExposureRisk, containmentSurface   | SPE-947 propagation graph integration         |
| `validateMediaContainedEventRecord(record)` — branching loop without branchRules → error; token guardrails on nested refs        | SPE-1091 field media contamination integration |
| `projectPlaybackExposureRisk(record, policy)` — deterministic risk projection + hook-compatible visual-trigger cross-check output | Full SPE-947 parent Done                      |
| Focused tests in `src/test/mediaContainedEventRegistry.test.ts`                                                                  | UI/report orchestration wiring                |

## Record contract (deterministic)

### Core fields

- **mediaKind** — `digital_recording`, `broadcast_capture`, `editorial_sequence`.
- **eventLoopState** — `linear`, `repeating`, `branching`, `frozen`.
- **playbackPosition** — non-negative integer playback checkpoint.
- **historicalDeviationFlag** — whether recorded sequence diverges from prior timeline reference.
- **custodyChainRefs** — ordered refs anchoring containment/evidence custody.
- **publicExposureRisk** — 0..1 unit score for outward propagation risk.
- **containmentSurface** — `airgap`, `filtered_viewing`, `no_playback`.
- **branchRules** — required when loop state is branching.
- **confidence / unknown / redacted** — projection legibility controls.

### Validation rules (examples)

- Missing `id` or `label` → error.
- Invalid union values / invalid score / invalid playback integer → error.
- `eventLoopState: branching` without non-empty `branchRules` → error.
- `containmentSurface: no_playback` with active `publicExposureRisk` → warning.
- Franchise / wiki / branded object-number token in id/label/nested refs → error.

### Projection (`projectPlaybackExposureRisk`)

- Inputs: record + optional policy (`currentWeek`, `minimumConfidence`, `redactUnknown`, `suppressHiddenConflictLabels`).
- Outputs: projected exposure score, risk band, playback stability score, symptom-first custody entries, and hook-compatible visual-trigger tags.

## Acceptance

- [x] Fixture: repeating loop with filtered_viewing containment.
- [x] Fixture: historicalDeviationFlag with custody chain.
- [x] Negative: no_playback containment with active publicExposureRisk unmitigated → warning.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + branching/no-playback guardrails.
3. **Projection** — `projectPlaybackExposureRisk` with deterministic risk + symptoms.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/mediaContainedEventRegistry.ts`                           |
| Tests  | `src/test/mediaContainedEventRegistry.test.ts`                        |
| Plan   | `planning/media-contained-event-registry-slice-1.md`                 |

## Branch

`jamesdyedbq/spe-2120-media-contained-event-registry-slice-1`

## Out of scope (parent closure)

- Full SPE-947 parent Done
- Propagation graph/cross-module runtime wiring
- Public narrative contamination processing under SPE-1091

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2120
- `src/domain/visualTriggerHazardRegistry.ts` — hazardous media sibling patterns
- `src/domain/antiNarrativeRecordCollapseRegistry.ts` — latest registry validation/projection conventions
