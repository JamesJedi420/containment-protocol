# SPE-70 — Hidden-state modality matrix slice 8 (false-detection output)

One-page implementation plan. Linear: [SPE-2289](https://linear.app/spectranoir/issue/SPE-2289) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Follows shipped [SPE-2288](https://linear.app/spectranoir/issue/SPE-2288) (PR #2421).

| Field      | Value                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2289 — Hidden-state modality matrix slice 8](https://linear.app/spectranoir/issue/SPE-2289) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70)                                                |
| **Branch** | `jamesdyedbq/spe-2289-hidden-state-modality-matrix-slice-8-false-detection-output`                   |
| **Status** | **Implemented** — pending PR                                                                                         |

## Goal

Add **false-detection output** (instrumentation attack) as a fifth case-authored `HiddenStateModalityKind` so tiered scans can return **fabricated contacts or class readouts** that diverge from truth-state in a deterministic, explainable way — without collapsing to instant full reveal and **without** conflating with illusion lifecycle ([SPE-2285](https://linear.app/spectranoir/issue/SPE-2285)).

## Prerequisite (on `main` @ `c474af93`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Modality compose     | `hiddenStateModality.ts`, `resolveScoutingWithCaseHiddenState`         |
| Post-matrix slice 7  | `signature_masking`, `layer:authored-signature-mask`, category skew    |
| Weekly orchestration | `evaluateHiddenStateScoutingWithRevealPayload`                         |
| Modality report copy | `detectionScanReportNotes.ts`                                          |
| Illusion lifecycle   | `hiddenStateIllusionLifecycle.ts` (`FABRICATED_CONTACT_READOUT_PREFIX` — **do not reuse** for this slice) |

## Gap (pre-slice)

- No case-authored modality for instrumentation-attack / false-detection scan skew.
- Illusion lifecycle fabricates **entities** with disproof paths; false-detection is **scan-output skew** on a real hidden target.
- `HiddenStateModalityKind` has no `false_detection_output` family.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Extend `HiddenStateModalityKind` with `false_detection_output`                                                                      | Glamour overlay (SPE-2290)                    |
| Authored activation via case tags (`modality-false-detection` and/or `instrumentation-attack`)                                       | Illusion lifecycle changes                    |
| Modality layer `layer:authored-false-detection` blocking canonical tier confirmation (not full presence suppression unless authored) | Mission triage UI                             |
| `applyFalseDetectionScanProjection` — deterministic fabricated presence/category readouts; canonical truth fields unchanged         | Full SPE-70 parent Done                       |
| Report prefix **`False-detection readout:`** (distinct from illusion `Fabricated contact readout:`)                                | Template-wide migration beyond 2–3 fixtures   |
| Wire through orchestration stack; optional tell tag hook if bounded                                                                 | RNG / probabilistic outputs                   |
| Unit + `advanceWeek` integration tests                                                                                             | Rewriting recon cache or tell priority globally |

## Modality contract (deterministic)

### Activation (authored)

- Tag `modality-false-detection` or `instrumentation-attack` while `hiddenState` is non-`revealed`.
- Resolver priority (stable): `displaced` > `disguised_identity` > `false_detection_output` > `signature_masking` > `concealed_presence`.

### Scan behavior

- Player-facing presence/category may show **fabricated contact** (fixture constant e.g. `fabricated maintenance contact`) while internal truth retains canonical identity/category.
- Fabricated values are **projection-only** — do not mutate `CaseInstance` truth fields.
- `counterDetection: true` strips `layer:authored-false-detection` without solving other modality families.

### Player-facing output

- Prefix: `False-detection readout:` (not illusion fabricated-contact prefix).
- One deterministic sentence when modality active; dedupe via existing `resolutionReasons` guard.

## Acceptance

- [x] Authored fixture: scan shows fabricated contact/class; internal truth unchanged; `hiddenState` stays non-`revealed`.
- [x] Distinct `DetectionScanResult` from concealed and signature-mask fixtures in shared compose path.
- [x] Counter-detection strips false-detection layer only; slices 1–7 regression unchanged.
- [x] Illusion lifecycle tests and readout prefixes unchanged (no prefix collision).
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Modality resolver** — tag activation, priority vs slice 7 families.
2. **Truth + layer compose** — fabricated projection + counter-reveal strip.
3. **Report copy** — distinct prefix + append dedupe.
4. **`advanceWeek`** — one integration fixture for false-detection modality.
5. **Regression** — illusion, signature-mask, tells, recon cache tests unchanged.

## File touch list (expected)

| Area           | Files                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| Modality       | `src/domain/hiddenStateModality.ts`                                                           |
| Compose        | `src/domain/revealPayloadScoutingIntegration.ts`                                              |
| Report copy    | `src/domain/detectionScanReportNotes.ts`                                                      |
| Tests          | `src/test/hiddenStateModality.test.ts`, extend `advanceWeek.hiddenStateScouting.test.ts`      |

## Branch

`jamesdyedbq/spe-2289-hidden-state-modality-matrix-slice-8-false-detection-output`

## Out of scope (slice 9 / parent)

- Glamour / presentation overlay ([SPE-2290](https://linear.app/spectranoir/issue/SPE-2290))
- Full SPE-70 parent closure

## See also

- `architecture/hidden-state-displacement-counter-detection.md` — False-detection output vocabulary
- `planning/hidden-modality-matrix-slice-7.md`
- `src/domain/hiddenStateIllusionLifecycle.ts` — illusion vs scan-skew boundary
