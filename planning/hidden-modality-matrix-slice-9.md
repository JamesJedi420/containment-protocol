# SPE-70 — Hidden-state modality matrix slice 9 (glamour / presentation overlay)

One-page implementation plan. Linear: [SPE-2290](https://linear.app/spectranoir/issue/SPE-2290) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Follows shipped [SPE-2289](https://linear.app/spectranoir/issue/SPE-2289) (PR #2422).

| Field      | Value                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2290 — Hidden-state modality matrix slice 9](https://linear.app/spectranoir/issue/SPE-2290) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70)                                                |
| **Branch** | `jamesdyedbq/spe-2290-hidden-state-modality-matrix-slice-9-glamour-presentation`                   |
| **Status** | **In Progress** — implementation on branch                                                   |

## Goal

Add **glamour / presentation overlay** as a sixth case-authored `HiddenStateModalityKind` so perception-layer fiction can block or skew category/hostility/identity tiers through the modality compose path — reusing glamour semantics beyond generic `concealmentLayersFromRating`, without collapsing to instant full reveal.

## Prerequisite (on `main` @ `2d10cb9d`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Modality compose     | `hiddenStateModality.ts`, `resolveScoutingWithCaseHiddenState`         |
| Post-matrix slice 7  | `signature_masking`, `layer:authored-signature-mask`, category skew    |
| Post-matrix slice 8  | `false_detection_output`, `layer:authored-false-detection`, fabricated readouts |
| Weekly orchestration | `evaluateHiddenStateScoutingWithRevealPayload`                         |
| Modality report copy | `detectionScanReportNotes.ts`                                          |
| Rating glamour layer | `concealmentLayersFromRating` → `layer:glamour` in `revealPayloadScoutingIntegration.ts` |

## Gap (pre-slice)

- `layer:glamour` applies from **anomaly concealment rating ≥ 2** only; no authored case modality.
- `HiddenStateModalityKind` has no `glamour_overlay` family.
- Modality report copy has no glamour/presentation-overlay prefix.
- Counter-reveal strips modality layers per family; glamour is not a selectable outer layer in the modality path.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Extend `HiddenStateModalityKind` with `glamour_overlay`                                                                            | Out-of-phase / anti-scan compartment families |
| Authored activation via case tags (`modality-glamour` and/or `presentation-overlay`)                                               | Mission triage UI                             |
| Modality layer **`layer:authored-glamour`** (distinct from rating `layer:glamour` — same dedupe lesson as slice 7)                 | Full SPE-70 parent Done                       |
| `applyGlamourOverlayScanProjection` — deterministic presentation skew (category/hostility); canonical truth fields unchanged       | Per-channel observer matrix                   |
| Report prefix **`Glamour readout:`** (or align with slice 3 naming in implementation)                                              | Template-wide migration beyond 2–3 fixtures   |
| Wire through orchestration stack; optional tell tag hook if bounded                                                                 | RNG / probabilistic outputs                   |
| Unit + `advanceWeek` integration tests                                                                                             | Removing rating-derived `layer:glamour`       |

## Modality contract (deterministic)

### Activation (authored)

- Tag `modality-glamour` or `presentation-overlay` while `hiddenState` is non-`revealed`.
- Resolver priority (stable): `displaced` > `disguised_identity` > `false_detection_output` > `signature_masking` > **`glamour_overlay`** > `concealed_presence`.

### Scan behavior

- Presence may register; **category, hostility, and exact identity** tiers blocked by `layer:authored-glamour` (mirror rating glamour blocked tiers).
- Category/hostility readouts show **authored presentation skew** (fixture constant e.g. `benign facility presentation`) while internal truth retains canonical identity.
- Skew values are **projection-only** — do not mutate `CaseInstance` truth fields.
- `counterDetection: true` strips `layer:authored-glamour` without solving other modality families.
- Rating-derived `layer:glamour` still applies when modality tag absent (regression).

### Player-facing output

- Prefix: `Glamour readout:` (distinct from signature-mask and false-detection prefixes).
- One deterministic sentence when modality active; dedupe via existing `resolutionReasons` guard.

## Acceptance

- [ ] Authored fixture: scan shows presentation skew; category/hostility/exact_identity blocked; internal truth unchanged; `hiddenState` stays non-`revealed`.
- [ ] Distinct `DetectionScanResult` from signature-mask and false-detection fixtures in shared compose path.
- [ ] Counter-detection strips glamour overlay layer only; slices 1–8 regression unchanged.
- [ ] Rating-derived `layer:glamour` from high concealment rating still works when modality tag absent.
- [ ] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Modality resolver** — tag activation, priority vs slice 7–8 families.
2. **Truth + layer compose** — presentation projection + counter-reveal strip.
3. **Report copy** — prefix + append dedupe.
4. **`advanceWeek`** — one integration fixture for glamour overlay.
5. **Regression** — signature-mask, false-detection, tells, recon cache, rating-layer tests unchanged.

## File touch list (expected)

| Area           | Files                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| Modality       | `src/domain/hiddenStateModality.ts`                                                           |
| Compose        | `src/domain/revealPayloadScoutingIntegration.ts`                                              |
| Report copy    | `src/domain/detectionScanReportNotes.ts`                                                      |
| Tells (optional) | `src/domain/hiddenStateModalityTells.ts`                                                    |
| Tests          | `src/test/hiddenStateModality.test.ts`, extend `advanceWeek.hiddenStateScouting.test.ts`      |

## Branch

`jamesdyedbq/spe-2290-hidden-state-modality-matrix-slice-9-glamour-presentation`

## Out of scope (parent closure)

- Full SPE-70 parent Done (evaluate after slice 9 ships or owner defers remainder)
- Out-of-phase / liminal presence, anti-scan compartments, mission triage chips

## See also

- `architecture/hidden-state-displacement-counter-detection.md` — Glamour / presentation overlay vocabulary
- `planning/hidden-modality-matrix-slice-8.md`
- `src/domain/revealPayloadScoutingIntegration.ts` — `GLAMOUR_LAYER`, `concealmentLayersFromRating`
