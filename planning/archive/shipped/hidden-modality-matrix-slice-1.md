# SPE-70 — Hidden-state modality matrix slice 1 (scouting integration)

One-page implementation plan. Linear: [SPE-2281](https://linear.app/spectranoir/issue/SPE-2281) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Builds on shipped [SPE-781](https://linear.app/spectranoir/issue/SPE-781) reveal payloads and [SPE-2107](https://linear.app/spectranoir/issue/SPE-2107) / [SPE-2113](https://linear.app/spectranoir/issue/SPE-2113) activation.

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2281 — Hidden-state modality matrix slice 1](https://linear.app/spectranoir/issue/SPE-2281) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70) |
| **Branch** | `jamesdyedbq/spe-70-hidden-modality-matrix-slice-1` |
| **Status** | **Shipped** — PR #2403 |

## Goal

Map case-level **hidden-state modalities** into the existing tiered reveal-payload flow so scouting resolution can return **mechanically distinct** player-facing outputs for concealed presence, false position (displacement), and disguised identity — in one reusable deterministic path.

Slice 1 is **domain-only**: pure helpers + scouting composition + tests. No UI, no new persistence shapes, no changes to scouting outcome bands or modifier math.

## Prerequisite (on `main`)

| Shipped | Anchor |
| --- | --- |
| Reveal resolver + scan families | `src/domain/revealPayload.ts` (SPE-781 slice 1) |
| Scouting composition | `src/domain/revealPayloadScoutingIntegration.ts` (SPE-781 slice 2) |
| Disguise composition (reference pattern) | `src/domain/revealPayloadDisguiseIntegration.ts` (SPE-781 slice 3) |
| Case fields | `hiddenState`, `displacementTarget`, `counterDetection`, `detectionConfidence` on `CaseInstance` |
| Activation | `src/domain/hiddenStateActivation.ts` |

## Gap (pre-slice)

- `buildSubjectTruthFromScouting` ignores case `hiddenState` / `displacementTarget`; only anomaly concealment rating drives layers.
- Disguise path treats `displaced` as inactive validation with `no contact` — displacement is not modeled as false-position mislocation in scouting scans.
- Parent [SPE-70](https://linear.app/spectranoir/issue/SPE-70) AC still requires ≥3 distinct modalities in one reusable flow and mode-selective counter-reveal.

## Scope (this slice)

| In | Out |
| --- | --- |
| New module `src/domain/hiddenStateModality.ts` (or extend scouting integration with explicit modality helpers) | False-entity / structural-illusion lifecycle |
| `HiddenStateModality` vocabulary aligned with `architecture/hidden-state-displacement-counter-detection.md` | New `GameState` / case packet fields |
| `buildSubjectTruthFromCaseHiddenState(case, subject, scoutingInput)` — truth snapshot per modality | Rewriting `resolveScouting` outcome bands |
| Modality-specific concealment layers: concealed presence, false position, disguised identity (compose with existing disguise layers where applicable) | Player UI or new report components |
| `resolveScoutingWithCaseHiddenState` (name TBD) — compose scouting + case modality + tiered scan | Full SPE-70 parent closure |
| Mode-selective counter-reveal: `counterDetection: true` strips **one** modality-appropriate outer layer via existing `layersToStrip` | Instrumentation-attack / false-detection modalities |
| Unit + integration tests in `src/test/hiddenStateModality.test.ts` and extend `revealPayloadScoutingIntegration.test.ts` | Weekly report copy changes (SPE-781 slice 5 pattern is separate) |
| Optional thin wiring hook for callers that already have `CaseInstance` + scouting input | Encounter / equipment scan families |

## Modality contract (slice 1)

Treat these as **first-class modes** (combinable only when explicitly authored on the case):

1. **Concealed presence** (`hiddenState: 'hidden'`, not `revealed`) — subject present in truth; presence tier may be ambiguous or suppressed; deeper tiers blocked by modality layers until counter-reveal or strong scan family.
2. **False position** (`hiddenState: 'displaced'` + optional `displacementTarget`) — subject present; player-facing presence/category may anchor to decoy locus (`displacementTarget` / route semantics); truth identity unchanged in internal fields.
3. **Disguised identity** — when case carries infiltration/disguise signals, **delegate** to existing disguise reveal subject builders; do not duplicate SPE-285 validation scores.

**Counter-reveal:** when `counterDetection: true`, strip exactly one outer layer **for the active modality family** (e.g. peel false-position layer without auto-revealing concealed presence on the same pass). Do not collapse to full `revealed` in this slice unless existing weekly propagation already does so elsewhere.

**Revealed / unset:** `hiddenState: 'revealed'` or unset — no modality overlay; scouting integration behaves as today.

## Acceptance

- [x] Three modalities produce **distinct** `DetectionScanResult` tier payloads in one shared compose function (fixture cases, no manual test-only `hiddenState` assignment beyond spawn helpers).
- [x] Concealed presence: strong scouting can reach category/hostility tiers only after layer strip; presence-only sweep stays ambiguous or withheld per policy.
- [x] False position: identity/category readouts can mislocate or reference decoy locus while internal truth retains canonical identity.
- [x] Disguised identity path: unchanged disguise validation scores; modality compose does not alter SPE-285 math (scouting path delegates disguise subject; SPE-285 weekly path untouched).
- [x] Counter-detection strips one modality layer without solving all modalities on the same scan.
- [x] `resolveScouting` legacy fields (`outcome`, `revealed`, `withheld`) unchanged vs plain `resolveScouting` for the same inputs.
- [x] `npm run lint` + targeted `npm run test:run` green on touched files.

## TDD order

1. **Modality truth builder** — `hiddenStateModality.test.ts`: hidden vs displaced vs revealed vs unset snapshots.
2. **Layer + counter-reveal** — strip one layer per modality; counterDetection flag behavior.
3. **Scouting compose** — `resolveScoutingWithCaseHiddenState` (TBD name) returns unchanged scouting outcome + distinct `detectionScan`.
4. **Regression** — `revealPayloadDisguiseIntegration.test.ts`, `weeklyMvpLoopProof.integration.test.ts` (if touched).

## File touch list (expected)

| Area | Files |
| --- | --- |
| Modality helpers | `src/domain/hiddenStateModality.ts` (new) |
| Scouting compose | `src/domain/revealPayloadScoutingIntegration.ts` (extend) |
| Tests | `src/test/hiddenStateModality.test.ts`, `src/test/revealPayloadScoutingIntegration.test.ts` |

## Branch

`jamesdyedbq/spe-70-hidden-modality-matrix-slice-1`

## Out of scope (later slices)

- Known-but-unresolved hidden nodes across multi-pass scouting (persistent recon cache)
- False-entity / structural-illusion lifecycle and interaction disproof
- Mode-specific tells (speech cadence, metadata spoofing, observer thresholds)
- Player-facing report/event-feed copy for modality readouts
- Full SPE-70 parent Done

## See also

- `architecture/hidden-state-displacement-counter-detection.md`
- `planning/backlog.md` items #1 and #4
- `planning/reveal-payload-slice-1.md` … `reveal-payload-slice-5.md`
- `src/domain/hiddenStateActivation.ts`
- `src/test/revealPayloadDisguiseIntegration.test.ts` — displaced baseline behavior
