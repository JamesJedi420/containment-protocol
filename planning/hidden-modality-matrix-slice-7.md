# SPE-70 — Hidden-state modality matrix slice 7 (signature masking)

One-page implementation plan. Linear: [SPE-2288](https://linear.app/spectranoir/issue/SPE-2288) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Follows shipped [SPE-2286](https://linear.app/spectranoir/issue/SPE-2286) / [SPE-2287](https://linear.app/spectranoir/issue/SPE-2287) (PR #2415 / #2417).

| Field      | Value                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2288 — Hidden-state modality matrix slice 7](https://linear.app/spectranoir/issue/SPE-2288) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70)                                              |
| **Branch** | `jamesdyedbq/spe-2288-hidden-modality-matrix-slice-7-signature-masking`                            |
| **Status** | **Queued** — post-matrix slice 1 of 3                                                              |

## Goal

Add **signature masking** as a fourth case-authored `HiddenStateModalityKind` so true class/strength can skew in tiered scans **without** collapsing to full reveal — reusing the existing `layer:signature-mask` concealment layer through the modality compose path, not only via generic `concealmentLayersFromRating`.

## Prerequisite (on `main` @ `acb3bf5b`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Modality compose     | `hiddenStateModality.ts`, `resolveScoutingWithCaseHiddenState`         |
| Weekly orchestration | `evaluateHiddenStateScoutingWithRevealPayload`                         |
| Modality report copy | `detectionScanReportNotes.ts`                                          |
| Recon cache          | `hiddenStateScoutingReconCache.ts`                                     |
| Illusion lifecycle   | `hiddenStateIllusionLifecycle.ts`                                      |
| Mode-specific tells  | `hiddenStateModalityTells.ts`                                          |
| Generic sig-mask layer (rating-only) | `concealmentLayersFromRating` in `revealPayloadScoutingIntegration.ts` |

## Gap (pre-slice)

- `layer:signature-mask` applies from **anomaly concealment rating** only; no authored case modality.
- `HiddenStateModalityKind` stops at `disguised_identity`; architecture doc lists signature masking as a distinct family.
- Modality report copy and tell prefixes have no signature-masking family.
- Counter-reveal strips modality layers per family; signature masking is not a selectable outer layer in the modality path.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Extend `HiddenStateModalityKind` with `signature_masking`                                                                           | False-detection output modality (SPE-2289)    |
| Authored activation via case tags (e.g. `modality-signature-mask`) mapped in `resolveHiddenStateModality`                            | Glamour / presentation overlay (SPE-2290)     |
| Modality-specific truth projection: category/hostility skew or withheld exact identity via `layer:signature-mask` in compose path | Removing rating-derived sig-mask from generic scouting (keep both paths; document precedence) |
| Modality report readout prefix (slice 3 pattern)                                                                                   | Mission triage UI chips                       |
| Optional tell tag family hook (e.g. `tell-signature-drift`) in `hiddenStateModalityTells.ts` if bounded                             | Full SPE-70 parent Done                       |
| Wire through existing orchestration stack (illusion → tells → compose → recon cache → report)                                        | Template-wide migration beyond 2–3 fixtures   |
| Unit + `advanceWeek` integration tests                                                                                             | Out-of-phase / anti-scan compartment families |

## Modality contract (deterministic)

### Activation (authored)

- Case tag `modality-signature-mask` (or documented equivalent in tests) while `hiddenState` is non-`revealed`.
- Priority when multiple modality signals present: document stable ordering vs disguised > displaced > concealed; signature masking composes as **outer skew layer** unless tags explicitly combine (test the authored combo you support).

### Scan behavior

- Presence may register; **exact identity** tier blocked by `layer:signature-mask`.
- Category/hostility readouts may show **authored skew** (fixture-defined benign class or downgraded hostility) while internal truth retains canonical identity.
- `counterDetection: true` strips signature-masking layer **without** auto-solving other modality families on the same pass.

### Player-facing output

- Prefix family: `Signature mask readout:` (or align with slice 3 naming in implementation).
- One deterministic sentence when modality active; dedupe via existing `resolutionReasons` guard.

## Acceptance

- [x] Authored fixture with `modality-signature-mask`: weekly report includes signature-mask readout; `hiddenState` stays non-`revealed`.
- [x] Tiered scan blocks `exact_identity` via modality path; category skew differs from plain concealed fixture.
- [x] Counter-detection strips signature-masking layer only; concealed/displaced/disguised fixtures unchanged.
- [x] Rating-derived `layer:signature-mask` from high concealment rating still works when modality tag absent (regression).
- [x] `npm run lint` + targeted `npm run test:run` green; slices 1–6 regression tests unchanged.

## TDD order

1. **Modality resolver** — tag activation, priority, `HiddenStateModalityKind` extension.
2. **Truth + layer compose** — skew projection + counter-reveal strip.
3. **Report copy** — prefix + append dedupe.
4. **`advanceWeek`** — one integration fixture for signature masking.
5. **Regression** — illusion, tells, recon cache, rating-layer tests unchanged.

## File touch list (expected)

| Area           | Files                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| Modality       | `src/domain/hiddenStateModality.ts`                                                           |
| Report copy    | `src/domain/detectionScanReportNotes.ts`                                                      |
| Tells (optional) | `src/domain/hiddenStateModalityTells.ts`                                                    |
| Orchestration  | `src/domain/caseResolutionOrchestration.ts` (only if report wiring needs hook)                |
| Tests          | `src/test/hiddenStateModality.test.ts`, extend `advanceWeek.hiddenStateScouting.test.ts`      |

## Branch

`jamesdyedbq/spe-2288-hidden-modality-matrix-slice-7-signature-masking`

## Out of scope (slices 8–9 / parent)

- False-detection / instrumentation-attack outputs ([SPE-2289](https://linear.app/spectranoir/issue/SPE-2289))
- Glamour / presentation overlay per channel ([SPE-2290](https://linear.app/spectranoir/issue/SPE-2290))
- Full SPE-70 parent closure

## See also

- `architecture/hidden-state-displacement-counter-detection.md` — Signature masking vocabulary
- `planning/hidden-modality-matrix-slice-6.md`
- `src/domain/revealPayloadScoutingIntegration.ts` — `SIGNATURE_MASK_LAYER`, `concealmentLayersFromRating`
