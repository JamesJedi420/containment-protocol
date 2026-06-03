# SPE-70 — Hidden-state modality matrix slice 11 (anti-scan compartments)

One-page implementation plan. Linear: [SPE-2303](https://linear.app/spectranoir/issue/SPE-2303) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Follows shipped [SPE-2302](https://linear.app/spectranoir/issue/SPE-2302) (PR #2467).

| Field      | Value                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2303 — Hidden-state modality matrix slice 11](https://linear.app/spectranoir/issue/SPE-2303) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70)                                                |
| **Branch** | `jamesdyedbq/spe-2303-hidden-state-modality-matrix-slice-11-anti-scan-compartments`                 |
| **Status** | In progress                                                                                          |

## Goal

Add **anti-scan compartments** (dead zones, Faraday, warded volumes) as an eighth case-authored `HiddenStateModalityKind` so tiered scans **degrade by policy** when bypass counterplay is absent — bounded score caution and distinct readouts, not RNG and not generic concealed presence.

## Prerequisite (on `main` @ `566170bf`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Modality compose     | `hiddenStateModality.ts`, `resolveScoutingWithCaseHiddenState`         |
| Post-matrix slices 7–10 | through `out_of_phase_presence`                                     |
| Weekly orchestration | `evaluateHiddenStateScoutingWithRevealPayload`                         |
| Modality report copy | `detectionScanReportNotes.ts`                                          |
| Route caution signal | `outOfPhaseScoutingScoreAdjustment`, recon cache caution               |

## Gap (pre-slice)

- No `anti_scan_compartment` family in `HiddenStateModalityKind`.
- No authored `layer:authored-anti-scan`.
- No bypass/compartment gate on scan degradation.
- No modality report prefix for anti-scan readouts.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Extend `HiddenStateModalityKind` with `anti_scan_compartment`                                                                      | Mission triage UI                             |
| Authored activation via `modality-anti-scan` and/or `anti-scan-compartment`                                                        | Full SPE-70 parent Done                       |
| Modality layer **`layer:authored-anti-scan`** (distinct from slice 10)                                                             | Per-channel observer matrix                   |
| Bypass gate: `scan-bypass` / `em-sweep` or case `compartment` token on team tags                                                   | RNG / probabilistic outputs                   |
| Misaligned: degraded presence projection + scan-caution score delta; aligned: partial clearance readout                            | Removing slices 7–10 behavior                 |
| Report prefix **`Anti-scan readout:`**                                                                                             | Template-wide migration beyond 2–3 fixtures   |
| Unit + `advanceWeek` integration tests                                                                                             | Intake weekly-hook stack (SPE-2292–SPE-2301)  |

## Modality contract (deterministic)

### Activation (authored)

- Tag `modality-anti-scan` or `anti-scan-compartment` while `hiddenState` is non-`revealed`.
- Resolver priority (stable): `displaced` > `disguised_identity` > `false_detection_output` > `signature_masking` > `glamour_overlay` > `out_of_phase_presence` > **`anti_scan_compartment`** > `concealed_presence`.

### Bypass / compartment alignment

- Case may set `compartment` (e.g. `warded-volume-alpha`).
- **Aligned** when team tags include `scan-bypass`, `em-sweep`, or (when `compartment` is set) that compartment token.
- **Misaligned**: truth `present` unchanged; scan projection uses degraded presence skew; bounded score delta + scan-caution reason.

### Counter-reveal

- `counterDetection: true` strips `layer:authored-anti-scan` without solving other modality families.

### Player-facing output

- Prefix: `Anti-scan readout:`.
- One deterministic sentence when modality active; dedupe via existing `resolutionReasons` guard.

## Acceptance

- [x] Authored fixture: misaligned compartment shows degraded presence + scan caution; bypass shows clearance readout without revealing `hiddenState`.
- [x] Distinct `DetectionScanResult` from out-of-phase and concealed fixtures in shared compose path.
- [x] Counter-detection strips anti-scan layer only; slices 1–10 regression unchanged.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Modality resolver** — tag activation, priority vs slice 10.
2. **Truth + layer compose** — authored layer + counter-reveal strip.
3. **Scan projection** — misaligned degraded vs aligned partial readout.
4. **Report copy** — prefix + append dedupe.
5. **Score adjustment** — misaligned scan caution in weekly orchestration.
6. **`advanceWeek`** — one integration fixture for anti-scan readout.
7. **Regression** — out-of-phase, glamour, recon cache unchanged.

## File touch list (expected)

| Area           | Files                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| Modality       | `src/domain/hiddenStateModality.ts`                                                           |
| Compose        | `src/domain/revealPayloadScoutingIntegration.ts`                                              |
| Report copy    | `src/domain/detectionScanReportNotes.ts`                                                      |
| Orchestration  | `src/domain/caseResolutionOrchestration.ts`                                                   |
| Tests          | `src/test/hiddenStateModality.test.ts`, `src/test/advanceWeek.hiddenStateScouting.test.ts`   |
| Docs           | `planning/hidden-modality-matrix-post-matrix-queue.md`, `planning/backlog.md`                 |

## Deferred

| Item | Owner | Why |
| ---- | ----- | --- |
| Mission triage illusion/tell chips | SPE-70 follow-up | Out of slice 11 boundary |
| Full SPE-70 parent Done | SPE-70 | Deferred families after slice 11 |

## See also

- `architecture/hidden-state-displacement-counter-detection.md` — Anti-scan compartment vocabulary
- `planning/hidden-modality-matrix-slice-10.md`
- `planning/hidden-modality-matrix-post-matrix-queue.md`
