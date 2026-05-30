# SPE-70 — Hidden-state modality matrix slice 2 (weekly orchestration wiring)

One-page implementation plan. Linear: [SPE-2282](https://linear.app/spectranoir/issue/SPE-2282) (child under [SPE-70](https://linear.app/spectranoir/issue/SPE-70)). Follows shipped [SPE-2281](https://linear.app/spectranoir/issue/SPE-2281) domain compose (PR #2403). Reference pattern: [SPE-781](https://linear.app/spectranoir/issue/SPE-781) slice 4 orchestration ([SPE-2253](https://linear.app/spectranoir/issue/SPE-2253), `planning/reveal-payload-slice-4.md`).

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2282 — Hidden-state modality matrix slice 2](https://linear.app/spectranoir/issue/SPE-2282) |
| **Parent** | [SPE-70](https://linear.app/spectranoir/issue/SPE-70) |
| **Branch** | `jamesdyedbq/spe-70-hidden-modality-matrix-slice-2` |
| **Status** | **Shipped** — SPE-2282 / PR #2405 |

## Goal

Wire slice-1 **`resolveScoutingWithCaseHiddenState`** into **`resolveAssignedCaseForWeek`** so concealed-presence and false-position cases attach tiered `detectionScan` during weekly resolution — mirroring the disguise orchestration path without changing scouting outcome bands, disguise validation scores, or mission outcome math.

Slice 2 is **orchestration-only**: input builders + weekly strategy carrier + report reason hook + tests. No UI, no new persistence shapes, no modality-specific report copy (slice 3).

## Prerequisite (on `main`)

| Shipped | Anchor |
| --- | --- |
| Modality compose (slice 1) | `src/domain/hiddenStateModality.ts`, `resolveScoutingWithCaseHiddenState` in `revealPayloadScoutingIntegration.ts` (SPE-2281, PR #2403) |
| Disguise orchestration (reference) | `evaluateBehaviorWeightedDisguiseValidationWithRevealPayload` in `caseResolutionOrchestration.ts` (SPE-2253) |
| Report reason hook | `appendDetectionScanResolutionReason` in `detectionScanReportNotes.ts` (SPE-2254) |
| Case fields | `hiddenState`, `displacementTarget`, `counterDetection`, `detectionConfidence` on `CaseInstance` |

## Gap (pre-slice)

- Slice 1 compose is **test-only**; no production caller invokes `resolveScoutingWithCaseHiddenState`.
- **`evaluateBehaviorWeightedDisguiseValidation`** activates only when `hiddenState === 'hidden'` **and** infiltration scrutiny tags fire — pure concealment cases get **no** `detectionScan`.
- **`hiddenState: 'displaced'`** fails disguise activation (`hiddenState !== 'hidden'`) — false-position cases get **no** `detectionScan`.
- Disguised infiltration cases already receive scans via the disguise path; slice 2 must **not** double-compose when disguise validation is active.

## Scope (this slice)

| In | Out |
| --- | --- |
| `buildScoutingRevealInputFromCase(case, agents, context)` — deterministic `ScoutingInput` + `ScoutingRevealSubject` from case/team (mirror `buildDisguiseRevealSubjectFromCase`) | New `GameState` / case persistence fields |
| `evaluateHiddenStateScoutingWithRevealPayload(...)` — gates on active modality; calls `resolveScoutingWithCaseHiddenState` | Modality-specific report copy (slice 3) |
| `resolveAssignedCaseForWeek` attaches result when modality ≠ `none` and disguise validation inactive | False-entity / structural-illusion lifecycle |
| `WeeklyCaseResolutionStrategy.hiddenStateScouting?` (or equivalent scan carrier on strategy) | Known-but-unresolved recon cache (slice 4) |
| `advanceWeek` reuses `appendDetectionScanResolutionReason` for hidden-state scouting scans | UI components |
| Integration tests in `revealPayloadOrchestration.test.ts`; optional `weeklyMvpLoopProof` extension for concealed case | Rewriting disguise path for active infiltration cases |
| Regression: existing disguise orchestration tests unchanged | Full SPE-70 parent closure |

## Orchestration contract

**When to run hidden-state scouting compose:**

1. `resolveHiddenStateModality(caseData)` returns `concealed_presence` or `false_position`, **or**
2. Modality is `disguised_identity` **and** `evaluateBehaviorWeightedDisguiseValidation` returns `active: false` (edge case — modality signal without scrutiny activation).

**When to skip (disguise path owns the scan):**

- Modality is `disguised_identity` **and** disguise validation is `active: true` — use existing `behaviorValidation.detectionScan` only.
- Modality is `none` (`hiddenState` unset or `revealed`).

**Outcome invariants:**

- Legacy scouting fields on compose result (`outcome`, `revealed`, `withheld`) must match plain `resolveScouting` for the same derived input.
- Mission score, degrade hints, and `applyBehaviorWeightedDisguiseValidationToCase` paths unchanged.
- Counter-detection layer strip behavior unchanged vs slice 1.

## Acceptance

- [ ] Concealed-presence fixture (hidden, concealment tags, no infiltration scrutiny): weekly strategy carries distinct `detectionScan`; legacy validation remains inactive.
- [ ] False-position fixture (`displaced` + `displacementTarget`): strategy carries decoy-anchored player-facing scan tiers; internal truth unchanged.
- [ ] Active disguised-infiltration fixture: existing `behaviorValidation.detectionScan` unchanged; hidden-state scouting compose **not** attached.
- [ ] Counter-detection case: one modality layer stripped in scan; mission outcome math unchanged vs pre-slice.
- [ ] `advanceWeek` appends detection readout resolution reason for eligible concealed case (reuse SPE-2254 formatter).
- [ ] `npm run lint` + targeted `npm run test:run` green on touched files.

## TDD order

1. **Input builder** — unit tests for `buildScoutingRevealInputFromCase`: team capability, anomaly concealment from case weights/tags, subject identity fields.
2. **Gating helper** — `evaluateHiddenStateScoutingWithRevealPayload`: skip when modality `none`; skip when disguise active; run for concealed + displaced.
3. **Orchestration** — `resolveAssignedCaseForWeek` integration tests (extend `revealPayloadOrchestration.test.ts`).
4. **Report hook** — `advanceWeek` or resolution-reason test for concealed case readout.
5. **Regression** — disguise orchestration tests + slice-1 modality tests unchanged.

## File touch list (expected)

| Area | Files |
| --- | --- |
| Scouting input builder | `src/domain/revealPayloadScoutingIntegration.ts` (extend) |
| Weekly orchestration | `src/domain/caseResolutionOrchestration.ts` |
| Report reasons | `src/domain/sim/advanceWeek.ts` (if carrier wiring needed) |
| Tests | `src/test/revealPayloadOrchestration.test.ts`, optionally `src/test/weeklyMvpLoopProof.integration.test.ts` |

## Branch

`jamesdyedbq/spe-70-hidden-modality-matrix-slice-2`

## Out of scope (later slices)

- Modality-aware report/event-feed copy (`detectionScanReportNotes` extensions) — slice 3
- Known-but-unresolved hidden nodes across multi-pass scouting (persistent recon cache) — slice 4
- False-entity / structural-illusion lifecycle — slice 5
- Mode-specific tells and observer-threshold validation
- Full SPE-70 parent closure

## See also

- `planning/hidden-modality-matrix-slice-1.md` (shipped)
- `planning/reveal-payload-slice-4.md` — orchestration pattern
- `architecture/hidden-state-displacement-counter-detection.md`
- `src/domain/hiddenStateModality.ts`
- `src/domain/disguiseValidation.ts` — activation gate (`hiddenState`, scrutiny tags)
