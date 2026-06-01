# SPE-1309 — Anti-narrative record-collapse registry slice 1

One-page implementation plan. Linear: [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) (child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309)). Follows shipped [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118) (concept-state transformation registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2119 — Anti-narrative record-collapse registry — coherence loss and report degradation (slice 1)](https://linear.app/spectranoir/issue/SPE-2119) |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine |
| **Branch** | `jamesdyedbq/spe-2119-anti-narrative-record-collapse-registry-slice-1`                                     |
| **Status** | **In Progress**                                                                                            |

## Goal

Add a pure deterministic **anti-narrative record-collapse registry** for hazards that attack story coherence, causality chains, report structure, and institutional memory — distinct from ordinary memetic fear or visual triggers.

## Prerequisite (on `main` @ `d7efce9d`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Concept-state ops    | `src/domain/conceptStateTransformationRegistry.ts` (SPE-2118 / PR #2437) |
| Self-censoring info  | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108) — symptom-first projection |
| Intake registry wave | SPE-2104–SPE-2118 sibling patterns                                       |
| Harvest batch        | `starter-picks-routing-65` (C21) in `planning/harvest-reconciliation-index.md` |

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `AntiNarrativeCollapseId` + `AntiNarrativeCollapseRecord` in `src/domain/antiNarrativeRecordCollapseRegistry.ts`                 | GameState persistence                         |
| collapseMode, affectedMediaRefs, coherenceScore, detectionLagWeeks, countermeasureState, institutionalBlindSpotRefs                | SPE-1309 unified engine wire-up               |
| `validateAntiNarrativeCollapseRecord(record)` — coherenceScore out of range → error; failed without attempt refs → warning       | Public narrative layer (SPE-1091)             |
| `projectRecordIntegrityLoss(record, policy)` — briefing/dossier degradation forecast with lag-aware coherence decay                | Full SPE-1309 parent Done                     |
| Focused tests in `src/test/antiNarrativeRecordCollapseRegistry.test.ts`                                                          | Competing histories wire-up (SPE-1259)        |

## Record contract (deterministic)

### Core fields

- **collapseMode** — `causality_gap`, `character_erasure`, `plot_hole`, `report_unwrite`.
- **affectedMediaRefs** — dossier/briefing/media refs showing degradation symptoms.
- **coherenceScore** — 0..1 unit score for narrative integrity.
- **detectionLagWeeks** — non-negative integer weeks before decay becomes observable.
- **countermeasureState** — `none`, `patch_narrative`, `quarantine_corpus`, `failed`.
- **countermeasureAttemptRefs** — optional refs documenting countermeasure attempts (required when state is `failed`).
- **institutionalBlindSpotRefs** — refs for institutional blind spots amplifying collapse.
- **confidence / unknown / redacted** — projection legibility without omniscient labels.

### Validation rules (examples)

- Missing `id` or `label` → error.
- Invalid union values, coherenceScore out of 0..1 → error.
- `countermeasureState: failed` without non-empty `countermeasureAttemptRefs` → warning.
- Franchise / wiki / branded object-number token → error (including nested refs).

### Projection (`projectRecordIntegrityLoss`)

- Inputs: record + optional policy (`currentWeek`, `minimumConfidence`, `redactUnknown`, `suppressHiddenConflictLabels`).
- Outputs: lag-aware projected coherence, degradation band, symptom-first media entries — not hidden attack truth labels.

## Acceptance

- [x] Fixture: causality_gap with quarantine_corpus countermeasure.
- [x] Fixture: coherenceScore decay over detectionLagWeeks.
- [x] Negative: countermeasure failed without documented attempt → warning.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + failed-without-attempt warning.
3. **Projection** — `projectRecordIntegrityLoss` lag-aware decay + symptom entries.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/antiNarrativeRecordCollapseRegistry.ts`                 |
| Tests  | `src/test/antiNarrativeRecordCollapseRegistry.test.ts`              |
| Plan   | `planning/anti-narrative-record-collapse-registry-slice-1.md`       |

## Branch

`jamesdyedbq/spe-2119-anti-narrative-record-collapse-registry-slice-1`

## Out of scope (parent closure)

- Full SPE-1309 parent Done
- GameState persistence and weekly orchestration wiring
- SPE-1091 public narrative layer and SPE-1259 competing histories integration

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2119
- `src/domain/conceptStateTransformationRegistry.ts` — sibling registry conventions (SPE-2118)
