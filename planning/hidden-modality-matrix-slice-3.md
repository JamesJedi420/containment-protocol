# SPE-70 — Hidden-state modality matrix slice 3 (modality report copy)

One-page implementation plan. Linear: [SPE-2283](https://linear.app/spectranoir/issue/SPE-2283) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Follows shipped [SPE-2282](https://linear.app/spectranoir/issue/SPE-2282) weekly orchestration (PR #2405). Reference pattern: [SPE-2254](https://linear.app/spectranoir/issue/SPE-2254) / `planning/reveal-payload-slice-5.md` (generic detection readout copy).

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2283 — Hidden-state modality matrix slice 3](https://linear.app/spectranoir/issue/SPE-2283) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70) |
| **Branch** | `jamesdyedbq/spe-2283-hidden-modality-matrix-slice-3-report-copy` |
| **Status** | Backlog — SPE-2283 |

## Goal

Make **weekly report** (and optional event-feed) copy reflect **which hidden-state modality** produced the tiered scan — concealed presence, false position, or disguised-identity scouting — without changing scan resolution, scouting outcome bands, disguise validation scores, or mission outcome math.

Slice 2 already attaches `hiddenStateScouting.detectionScan` and appends a generic **`Detection readout:`** line via `appendDetectionScanResolutionReason`. Slice 3 is **copy-only**: modality prefixes, framing, append gating tuned per modality, and end-to-end `advanceWeek` proof.

## Prerequisite (on `main`)

| Shipped | Anchor |
| --- | --- |
| Modality compose (slice 1) | `src/domain/hiddenStateModality.ts`, `resolveScoutingWithCaseHiddenState` (SPE-2281, PR #2403) |
| Weekly orchestration (slice 2) | `evaluateHiddenStateScoutingWithRevealPayload`, `WeeklyCaseResolutionStrategy.hiddenStateScouting?` (SPE-2282, PR #2405) |
| Generic readout hook | `appendDetectionScanResolutionReason` in `detectionScanReportNotes.ts` (SPE-2254) |
| False-position projection | `applyFalsePositionScanProjection` — decoy locus in `playerFacingValue` |
| Case fields | `hiddenState`, `displacementTarget`, `counterDetection`, `detectionConfidence` on `CaseInstance` |

## Gap (pre-slice)

| Area | Today | Slice 3 target |
| --- | --- | --- |
| Report prefix | One `Detection readout:` prefix for disguise and hidden-state scouting | Modality-specific prefixes / lead-ins |
| False position | Decoy tiers in scan fields | Report framed as **displacement / decoy** readout |
| Concealed presence | Scan tiers work; report sounds like generic detection | **Concealment / hidden-presence** framing |
| Disguise edge case | Inactive disguise + `disguised_identity` uses hidden-state path | No duplicate or contradictory readout vs active disguise |
| `advanceWeek` | Orchestration tests call append manually | Integration: concealed / displaced → `explanationNotes` with modality copy |
| Event feed | `concealment.activated` has mode-specific activation summaries | Optional same-week enrichment when scan exists (bounded) |

## Scope (this slice)

| In | Out |
| --- | --- |
| Extend `detectionScanReportNotes.ts`: modality-aware `formatDetectionScanSummary` (or parallel helpers) | New `GameState` / case persistence fields |
| Modality prefixes: `Concealment readout:`, `Displacement readout:`, cover readout for disguised-identity scouting path; keep `Detection readout:` for disguise `behaviorValidation` | Changing `resolveDetectionScan` / layer math |
| `appendDetectionScanResolutionReason` resolves `resolveHiddenStateModality(caseData)` for `hiddenStateScouting` | Known-but-unresolved recon cache (slice 4) |
| Modality-aware `shouldAppend…` for hidden-state path (suppress presence-only absent contact; allow false-position decoy tiers) | False-entity / structural-illusion lifecycle (slice 5) |
| `advanceWeek` integration tests for concealed + displaced weekly reports | New React report components |
| Unit tests in `detectionScanReportNotes.test.ts`; orchestration regression | Rewriting disguise validation copy |
| Optional: enrich `concealment.activated` / weekly `report.notes` when same-week scan exists | New event types unless existing payload enrichment is trivial |

## Copy contract

Reference: `architecture/hidden-state-displacement-counter-detection.md` (projection mismatch), `concealmentActivationFeed.ts`.

| Modality | Prefix | Notes |
| --- | --- | --- |
| `concealed_presence` | `Concealment readout:` | Presence ambiguity, not identity validation |
| `false_position` | `Displacement readout:` | Lead with decoy locus when `displacementTarget` set |
| `disguised_identity` (hidden-state path only) | `Cover readout:` (or agreed alias) | Only when disguise validation inactive |
| Disguise `behaviorValidation` | `Detection readout:` (unchanged) | No regression for SPE-781 slice 5 |

**Body:** Join `fields[].playerFacingValue` in resolver order; no `internalValue`. Keep counter-detection peel suffix when `strippedLayerIds` non-empty.

**Emit when:** Disguise path — existing rules. Hidden-state path — `hiddenStateScouting.active`, modality ≠ `none`, meaningful tiers (adjust `shouldAppendDetectionScanReportNote` as needed).

**Dedup:** One readout line per resolution (guard across modality prefix family).

**Legacy coexistence:** Keep `Behavior validation:` and scalar `detectionConfidence`; modality readout is additional `resolutionReasons` → `explanationNotes`.

## Acceptance

- [ ] Concealed-presence weekly mission: `explanationNotes` contains concealment-framed readout (not only generic `Detection readout`).
- [ ] False-position fixture (`displaced` + `displacementTarget`): displacement-framed readout retains decoy locus in tier clauses.
- [ ] Active disguised infiltration: disguise readout unchanged; no second hidden-state readout line.
- [ ] Counter-detection peel: modality-specific suffix; mission scores unchanged vs SPE-2282 baselines.
- [ ] `npm run lint` + targeted `npm run test:run` green on touched files.

## TDD order

1. **Prefix + formatter unit tests** — per-modality summary strings from fixture scans.
2. **Append gating** — concealed vs displaced vs inactive presence-only; dedup across prefixes.
3. **`appendDetectionScanResolutionReason` integration** — extend `revealPayloadOrchestration.test.ts`.
4. **`advanceWeek` E2E** — concealed + displaced through full week advance → `missionResult.explanationNotes`.
5. **Regression** — SPE-2254 disguise readout tests and SPE-2282 orchestration math unchanged.

## File touch list (expected)

| Area | Files |
| --- | --- |
| Formatters | `src/domain/detectionScanReportNotes.ts` |
| Modality helper (optional) | `src/domain/hiddenStateModality.ts` — prefix helper only if cohesive |
| Weekly hook | `src/domain/sim/advanceWeek.ts` — pass `caseData` into append if needed |
| Optional feed | `src/domain/concealmentActivationFeed.ts` or small companion module |
| Tests | `src/test/detectionScanReportNotes.test.ts`, `src/test/advanceWeek.hiddenStateScouting.test.ts` (new) or extend `advanceWeek.behaviorValidation.test.ts` |

## Branch

`jamesdyedbq/spe-2283-hidden-modality-matrix-slice-3-report-copy`

## Out of scope (later slices)

- Known-but-unresolved hidden nodes across multi-pass scouting (persistent recon cache) — slice 4
- False-entity / structural-illusion lifecycle — slice 5
- Mode-specific tells and observer-threshold validation
- Mission triage UI scan chips (unless a later UX slice owns it)
- Full SPE-70 parent closure

## See also

- `planning/hidden-modality-matrix-slice-1.md` (shipped)
- `planning/hidden-modality-matrix-slice-2.md` (shipped)
- `planning/reveal-payload-slice-5.md` — formatter pattern
- `architecture/hidden-state-displacement-counter-detection.md`
- `src/domain/hiddenStateModality.ts`
- `src/domain/concealmentActivationFeed.ts`
