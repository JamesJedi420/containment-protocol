# SPE-70 — Hidden-state modality matrix slice 10 (out-of-phase / liminal presence)

One-page implementation plan. Linear: [SPE-2302](https://linear.app/spectranoir/issue/SPE-2302) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Follows shipped [SPE-2290](https://linear.app/spectranoir/issue/SPE-2290) (PR #2423).

| Field      | Value                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2302 — Hidden-state modality matrix slice 10](https://linear.app/spectranoir/issue/SPE-2302) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70)                                                |
| **Branch** | `jamesdyedbq/spe-2302-hidden-state-modality-matrix-slice-10-out-of-phase-presence`                 |
| **Status** | In progress                                                                                          |

## Goal

Add **out-of-phase / liminal presence** as a seventh case-authored `HiddenStateModalityKind` so the target registers only when route or liminal-frequency alignment matches — otherwise presence stays absent or partial and route caution / scouting score adjust deterministically.

## Prerequisite (on `main` @ `50bcf3af`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Modality compose     | `hiddenStateModality.ts`, `resolveScoutingWithCaseHiddenState`         |
| Post-matrix slices 7–9 | `signature_masking`, `false_detection_output`, `glamour_overlay`   |
| Weekly orchestration | `evaluateHiddenStateScoutingWithRevealPayload`                         |
| Modality report copy | `detectionScanReportNotes.ts`                                          |
| Route caution signal | `scoutingReconCacheScoreAdjustment` (SPE-2284)                         |

## Gap (pre-slice)

- No `out_of_phase_presence` family in `HiddenStateModalityKind`.
- No authored `layer:authored-out-of-phase`.
- No route/frequency gate on scouting truth `present`.
- No modality report prefix for liminal / out-of-phase readouts.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Extend `HiddenStateModalityKind` with `out_of_phase_presence`                                                                        | Anti-scan compartment families                |
| Authored activation via `modality-out-of-phase` and/or `liminal-presence`                                                          | Mission triage UI                             |
| Modality layer **`layer:authored-out-of-phase`** (distinct from slices 7–9)                                                          | Full SPE-70 parent Done                       |
| Route/frequency gate: `route` on case + `liminal-frequency` or route token on team tags                                            | Per-channel observer matrix                   |
| Misaligned: `present: false` + route-caution score delta; aligned: partial presence projection                                       | RNG / probabilistic outputs                   |
| Report prefix **`Out-of-phase readout:`**                                                                                          | Removing slices 7–9 behavior                  |
| Unit + `advanceWeek` integration tests                                                                                             | Template-wide migration beyond 2–3 fixtures   |

## Modality contract (deterministic)

### Activation (authored)

- Tag `modality-out-of-phase` or `liminal-presence` while `hiddenState` is non-`revealed`.
- Resolver priority (stable): `displaced` > `disguised_identity` > `false_detection_output` > `signature_masking` > `glamour_overlay` > **`out_of_phase_presence`** > `concealed_presence`.

### Route / frequency alignment

- Case may set `route` (e.g. `ritual-corridor-alpha`).
- **Aligned** when team tags include `liminal-frequency`, or when `route` is set and team tags include that route token; when `route` is unset, `liminal-frequency` alone aligns.
- **Misaligned**: truth `present: false`; scan shows absent-route readout; bounded score delta + route-caution reason.
- **Aligned**: truth `present: true`; layer blocks category/hostility/exact_identity; presence projection `liminal trace contact`.

### Counter-reveal

- `counterDetection: true` strips `layer:authored-out-of-phase` without solving other modality families.

### Player-facing output

- Prefix: `Out-of-phase readout:`.
- One deterministic sentence when modality active; dedupe via existing `resolutionReasons` guard.

## Acceptance

- [ ] Authored fixture: misaligned route shows absent presence + route caution; aligned shows liminal trace without revealing `hiddenState`.
- [ ] Distinct `DetectionScanResult` from glamour and concealed fixtures in shared compose path.
- [ ] Counter-detection strips out-of-phase layer only; slices 1–9 regression unchanged.
- [ ] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Modality resolver** — tag activation, priority vs slice 9.
2. **Truth + layer compose** — route gate on `present` + counter-reveal strip.
3. **Report copy** — prefix + append dedupe.
4. **Score adjustment** — misaligned route caution in weekly orchestration.
5. **`advanceWeek`** — one integration fixture for out-of-phase readout.
6. **Regression** — glamour, signature-mask, tells, recon cache unchanged.

## File touch list (expected)

| Area           | Files                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| Modality       | `src/domain/hiddenStateModality.ts`                                                           |
| Compose        | `src/domain/revealPayloadScoutingIntegration.ts`                                              |
| Report copy    | `src/domain/detectionScanReportNotes.ts`                                                      |
| Orchestration  | `src/domain/caseResolutionOrchestration.ts`                                                   |
| Tests          | `src/test/hiddenStateModality.test.ts`, `src/test/advanceWeek.hiddenStateScouting.test.ts`   |
| Docs           | `planning/hidden-modality-matrix-post-matrix-queue.md`, `planning/backlog.md`                 |

## Out of scope (parent closure)

- Anti-scan compartments (dead zones, Faraday, warded volumes)
- Full SPE-70 parent Done
- Mission triage chips

## See also

- `architecture/hidden-state-displacement-counter-detection.md` — Out-of-phase / liminal presence vocabulary
- `planning/hidden-modality-matrix-slice-9.md`
- `planning/hidden-modality-matrix-post-matrix-queue.md`
