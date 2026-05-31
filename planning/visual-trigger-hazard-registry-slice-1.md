# SPE-947 — Visual-trigger hazard registry slice 1

One-page implementation plan. Linear: [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Follows shipped [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) (pattern source series intake registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2111 — Visual-trigger hazard registry — pursuit state, hazardous media, and exposure targets (slice 1)](https://linear.app/spectranoir/issue/SPE-2111) |
| **Parent** | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — Visual-trigger and pursuit-adjacent hazard intake |
| **Branch** | `jamesdyedbq/spe-2111-visual-trigger-hazard-registry-pursuit-state-hazardous-media`                         |
| **Status** | Implemented on branch (pending PR)                                                                       |

## Goal

Add a pure deterministic **visual-trigger hazard registry** for anomalies whose hazardous feature propagates through sight, recordings, and derivative media — plus exposure-created pursuit targets — without importing external wiki object numbers, incident names, or franchise labels.

## Prerequisite (on `main` @ `933634c2`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Pattern source series | `src/domain/patternSourceSeriesRegistry.ts` (SPE-2110 / PR #2431)   |
| Public disclosure    | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109)               |
| Self-censoring info  | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108)            |
| Intake registry wave | SPE-2104 / SPE-2105 / SPE-2106 sibling patterns                        |
| Harvest hub closure  | batches on SPE-2111 in `planning/harvest-reconciliation-index.md`    |

## Gap (pre-slice)

- No bounded schema for visual-trigger media hazards, pursuit state, or exposure targets.
- No deterministic validation for franchise tokens, active pursuit without targets, or filter-latency countermeasure gaps.
- No exposure-chain risk projection or observer-awareness escalation helper.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `VisualTriggerHazardId` + `VisualTriggerHazardRecord` in `src/domain/visualTriggerHazardRegistry.ts`                              | GameState persistence                         |
| triggerMedium, awarenessRequirement, derivativeHazardProfile, pursuitState, targetInstanceIds, occlusionState, latentActivation   | Pursuit vector simulator integration          |
| `observerAwarenessEscalation` — deterministic pursuit/manifestation/communication/dream/evidence bands                           | Countermeasure ledger link                    |
| `presentationMismatchProfile` — uncanny human-mimic metadata fields                                                                | Propagation graph wire-up (#965 family)       |
| `HazardousMediaInstance` sub-record — custody, deletion, storage, access history, sweep, disposal deadline, repost chain           | Field UI                                    |
| `validateVisualTriggerHazardRecord(record)`                                                                                        | SPE-947 parent Done                           |
| `projectExposureChainRisk(record, policy)` — broadcast-scale escalation forecast                                                   |                                               |
| Focused tests in `src/test/visualTriggerHazardRegistry.test.ts`                                                                    |                                               |

## Record contract (deterministic)

### Core fields

- **triggerMedium** — `direct_sight`, `photo`, `video_frame`, `thumbnail`, `sensor_feed`, `background_fragment`.
- **awarenessRequirement** — `conscious`, `subconscious_retinal`, `machine_preprocess`.
- **derivativeHazardProfile** — `full`, `partial`, `artistic_exempt`, `unknown`, `distorted`, `latent`.
- **pursuitState** — `dormant`, `distressed`, `active_pursuit`, `resolved`.
- **targetInstanceIds** — exposure-created pursuit target queue entries.
- **occlusionState** — `exposed`, `covered`, `filtered`.
- **latentActivation** — dormant public-media hazard flag (years-later activation path).
- **presentationMismatchProfile** — optional limb drift, feature occlusion, nonstandard movement, camera-specific reveal scalars.
- **hazardousMediaInstances** — custody, deletion status, storage scope, access history, sweep status, disposal deadline week, copy/repost chain refs.

### Validation rules (examples)

- Franchise / wiki / branded object-number token in id or CP-neutral field → error.
- `active_pursuit` without non-empty `targetInstanceIds` → error.
- `filterLatencyWeeks` < `exposurePathWeeks` without documented filter failure mode → warning.
- Invalid union values, empty media instance ids, out-of-range unit scores → error.

## Acceptance

- [x] Fixture: background_fragment trigger with years-later latent activation.
- [x] Fixture: subconscious_retinal exposure with failed filter latency.
- [x] Fixture: artistic_exempt derivative does not inherit full trigger profile.
- [x] Fixture: observer awareness increase transitions pursuit band without random roll.
- [x] Fixture: disposal deadline week forces sweep/occlusion/redaction state before week N.
- [x] occlusionState `covered` allows pursuit resolution transition.
- [x] Negative: imported object number in record id → validation error.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + negative lint cases.
3. **resolveEffectiveDerivativeHazard** — artistic_exempt / partial profiles.
4. **observerAwarenessEscalation** — deterministic pursuit band transitions.
5. **resolveDisposalDeadlineCompliance** + **resolvePursuitStateAfterOcclusion**.
6. **projectExposureChainRisk** — broadcast-scale forecast.
7. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                       |
| ------ | ----------------------------------------------------------- |
| Domain | `src/domain/visualTriggerHazardRegistry.ts`                 |
| Tests  | `src/test/visualTriggerHazardRegistry.test.ts`              |
| Plan   | `planning/visual-trigger-hazard-registry-slice-1.md`        |

## Branch

`jamesdyedbq/spe-2111-visual-trigger-hazard-registry-pursuit-state-hazardous-media`

## Out of scope (parent closure)

- Full SPE-947 parent Done
- GameState persistence and weekly orchestration wiring
- Propagation graph, pursuit simulator, countermeasure ledger

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2111
- `src/domain/publicDisclosureStateRegistry.ts` — validation + projection conventions (SPE-2109)
- Harvest batches: `visual-trigger-hostile-65`, `collaborative-visual-folklore-20`, `domestic-media-intrusion-43`
