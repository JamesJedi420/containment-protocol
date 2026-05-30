# SPE-70 — Hidden-state modality matrix slice 6 (mode-specific tells)

One-page implementation plan. Linear: [SPE-2286](https://linear.app/spectranoir/issue/SPE-2286) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Follows shipped [SPE-2285](https://linear.app/spectranoir/issue/SPE-2285) (PR #2411).

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2286 — Hidden-state modality matrix slice 6](https://linear.app/spectranoir/issue/SPE-2286) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70) |
| **Branch** | `jamesdyedbq/spe-2286-hidden-modality-matrix-slice-6-modality-tells` |
| **Status** | Backlog — SPE-2286 |

## Goal

Add **deterministic mode-specific tells** so concealed, displaced, and disguised-identity cases can leak bounded hints (speech cadence, metadata spoofing, observer-threshold scrutiny) **without** full reveal — satisfying the parent AC line for tells / threshold-dependent observer validation.

Slice 6 closes the post-matrix gap called out in slice 5; it extends the shipped stack (slices 1–5) without new scan families or RNG.

## Prerequisite (on `main` @ `64225023`)

| Shipped | Anchor |
| --- | --- |
| Modality compose | `hiddenStateModality.ts`, `resolveScoutingWithCaseHiddenState` (SPE-2281) |
| Weekly orchestration | `evaluateHiddenStateScoutingWithRevealPayload` (SPE-2282) |
| Modality report copy | `detectionScanReportNotes.ts` (SPE-2283) |
| Recon cache | `hiddenStateScoutingReconCache.ts` (SPE-2284) |
| Illusion lifecycle | `hiddenStateIllusionLifecycle.ts` (SPE-2285) |
| Disguise behavior signals | `disguiseValidation.ts` (`evidenceSignals`, threshold readers) |

## Gap (pre-slice)

- Modality readouts describe **what** the scan shows; they do not expose **mode-specific leakage** (cadence, metadata, observer band).
- Parent [SPE-70](https://linear.app/spectranoir/issue/SPE-70) AC: concealment/disguise leaks through tells or threshold-dependent validation — not universal exposure.
- `disguiseValidation` covers infiltration disguise scrutiny; hidden-state modalities need a **parallel bounded tell path** that does not double-run disguise validation.

## Scope (this slice)

| In | Out |
| --- | --- |
| `hiddenStateModalityTells.ts` — resolve tell profile from tags/case fields, evaluate tell exposure | New hidden-state modality families (signature masking, glamour, …) |
| Authored activation via case tags (e.g. `tell-speech-cadence`, `tell-metadata-spoof`, `observer-threshold-strict`) mapped to `HiddenStateModalityKind` | Mission triage UI chips |
| **Observer threshold:** gate tell firing on `teamScoutingCapability` vs `anomalyConcealment` bands (deterministic compare) | RNG or probabilistic tells |
| **Tell readouts** appended to weekly `resolutionReasons` (prefix family per modality) | Rewriting illusion lifecycle or recon cache |
| Optional bounded `detectionConfidence` nudge or `scoreAdjustment` when tell fires (reuse orchestration hooks) | Full SPE-70 parent Done |
| Wire tell evaluation **after** illusion lifecycle pass, **before** hidden-state scouting compose | Template-wide migration (2–3 fixtures in tests) |
| Persist nothing new unless a minimal `hiddenStateTellSignals?: readonly string[]` on case is required for multi-week continuity — prefer stateless weekly evaluation | UI components |

## Tell contract (deterministic)

### Activation (authored)

| Modality | Example tags | Tell kind |
| --- | --- | --- |
| `concealed_presence` | `tell-thermal-residual` | Residual signature / timing mismatch |
| `false_position` | `tell-route-timing` | Decoy locus inconsistent with movement log |
| `disguised_identity` | `tell-speech-cadence`, `tell-metadata-spoof` | Cadence or metadata inconsistency |
| Any hidden-state modality | `observer-threshold-strict` | High-concealment case requires stronger observer band to suppress tell |

If multiple tell tags present, emit **at most one** primary tell per weekly pass (stable priority: disguised > displaced > concealed).

### Observer threshold gate

- Compute `teamScoutingCapability` and `anomalyConcealment` (existing helpers in `revealPayloadScoutingIntegration.ts`).
- When `observer-threshold-strict` (or authored `detectionConfidence` above floor): tell fires only if `teamScoutingCapability < anomalyConcealment` (observer band too weak for concealment rating).
- When tag absent: tell fires when modality is non-`none` and matching tell tag present.

### Player-facing output

- Prefix family (slice 3 pattern): `Concealment tell readout:`, `Displacement tell readout:`, `Cover tell readout:` (or single `Modality tell readout:` with modality label).
- One deterministic sentence per fired tell; append after modality/illusion readout, dedupe via existing `resolutionReasons` guard.
- Tells do **not** add `exact_identity` tiers or force `revealed` hiddenState.

## Orchestration contract

```text
illusion lifecycle pass → evaluate modality tells → hidden-state scouting compose → recon cache → report append (modality + tell)
```

- Do not run tell path when `behaviorValidation.active` (disguise path owns scrutiny copy).
- Illusion `active`/`disproved` may still receive tells only when tags demand it; document precedence in tests.

## Acceptance

- [ ] Concealed fixture with tell tag: weekly report includes concealment tell readout; `hiddenState` stays non-`revealed`.
- [ ] Displaced fixture with route-timing tell: readout references decoy/route inconsistency without full reveal.
- [ ] Disguised fixture with speech/metadata tell: readout fires; disguise validation path unchanged.
- [ ] Observer-threshold-strict: tell suppressed when capability ≥ concealment, fires when below.
- [ ] `npm run lint` + targeted `npm run test:run` green; slices 1–5 regression tests unchanged.

## TDD order

1. **Tell unit tests** — tag activation, priority, threshold gate.
2. **Report copy** — prefix + append dedupe with modality/illusion readouts.
3. **Orchestration** — `resolveAssignedCaseForWeek` carries tell signals on result or case.
4. **`advanceWeek`** — one integration case per modality tell family.
5. **Regression** — disguise + illusion + recon cache tests unchanged.

## File touch list (expected)

| Area | Files |
| --- | --- |
| Tells | `src/domain/hiddenStateModalityTells.ts` (new) |
| Orchestration | `src/domain/caseResolutionOrchestration.ts` |
| Report copy | `src/domain/detectionScanReportNotes.ts` |
| Scouting integration | `src/domain/revealPayloadScoutingIntegration.ts` (optional metadata on scouting result) |
| Models | `src/domain/models.ts` (only if persistence needed) |
| Tests | `src/test/hiddenStateModalityTells.test.ts`, extend `advanceWeek.hiddenStateScouting.test.ts` |

## Branch

`jamesdyedbq/spe-2286-hidden-modality-matrix-slice-6-modality-tells`

## Out of scope (post-matrix / parent)

- Mission triage illusion/tell chips
- Signature masking, false-detection output, glamour modalities
- Full SPE-70 parent closure (may remain Backlog after slice 6 if optional modality families stay open)

## See also

- `architecture/hidden-state-displacement-counter-detection.md` (Counters and tells)
- `planning/hidden-modality-matrix-slice-5.md`
- `src/domain/disguiseValidation.ts` — behavior-weighted scrutiny pattern
- `src/domain/detectionScanReportNotes.ts`
