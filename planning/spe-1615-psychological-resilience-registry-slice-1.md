# SPE-2433 — Psychological resilience registry domain anchor (slice 1)

One-page implementation plan. Linear: [SPE-2433](https://linear.app/spectranoir/issue/SPE-2433) (child under [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615)). Follows shipped surveillance tuning registry anchor (`src/domain/surveillanceCapacityInterventionTuningRegistry.ts`, SPE-848 slice 1).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2433 — Psychological resilience registry domain anchor (slice 1)](https://linear.app/spectranoir/issue/SPE-2433) |
| **Parent** | [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615) — Psychological resilience depletion             |
| **Branch** | `jamesdyedbq/spe-1615-psychological-resilience-registry-slice-1`                                           |
| **Status** | **Ready for PR**                                                                                           |
| **Base `main` SHA** | `9573ec37`                                                                                          |

## Goal

Add a pure deterministic **psychological resilience depletion registry** for operator mental reliability under repeated impossible-evidence and cognitohazard exposure — compact depletion ladder, minor complications before breakdown, and rest-recoverable vs treatment-required gating.

## Prerequisite (on `main` @ `9573ec37`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Surveillance tuning registry | `src/domain/surveillanceCapacityInterventionTuningRegistry.ts` (SPE-848 slice 1) |
| Therapeutic care registry | `src/domain/containedPersonTherapeuticCareRegistry.ts` (SPE-2115) |
| Cross-join compose host | `composeCoerciveProtocolIntegratedHealthReconciliation` (SPE-1908 / SPE-2430) |
| Fatigue channels | `src/domain/agentFatigueChannels.ts` (SPE-130)                         |

## Gap (pre-slice)

- No bounded schema for operator psychological resilience depletion under repeated exposure.
- No deterministic validation distinguishing rest-recoverable stress from treatment-required breakdown.
- No `projectPsychologicalResilienceReview` exposure/depletion/complication signals for cross-join follow-up.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `PsychologicalResilienceId` + `PsychologicalResilienceRecord` in `src/domain/psychologicalResilienceRegistry.ts`                   | GameState persistence                         |
| `operatorRef`, depletion ladder, exposure score/count, complications, recovery channel, treatment/rest flags                       | `advanceWeek` orchestration hook              |
| `validatePsychologicalResilienceRecord` — franchise token → error; breakdown/rest contradictions → warning                           | Planning mirror UI                            |
| `projectPsychologicalResilienceReview` — exposure/depletion/complication/treatment-gating signals                                  | SPE-1908 cross-join compose wire-up           |
| `sanitizePsychologicalResilienceRecords` hydration helper                                                                          | Full SPE-1615 parent Done                     |
| Focused tests in `src/test/psychologicalResilienceRegistry.test.ts`                                                                |                                               |

## Record contract (deterministic)

### Core fields

- **operatorRef** — agent roster ref for operator linkage.
- **depletionBand** — `stable`, `strained`, `depleted`, `compromised`, `breakdown`.
- **exposureScore** — 0..1 cumulative exposure input.
- **exposureEventCount** — non-negative integer staged depletion counter.
- **exposureSources** — optional bounded source tags (`impossible_evidence`, `cognitohazard_contact`, `forbidden_knowledge`, `containment_failure_witness`).
- **activeComplications** — optional bounded tags (`hypervigilance`, `memory_gaps`, `communication_strain`, `fixation`, `avoidance`).
- **recoveryChannel** — `rest_recoverable`, `counseling_recommended`, `treatment_required`, `long_horizon_harm`.
- **treatmentRequired** / **restRecoverable** — explicit gating flags.
- **confidence / unknown / redacted** — projection legibility without dumping hidden dossier truth.

### Validation rules (examples)

- Missing `id`, `label`, or `operatorRef` → error.
- Invalid band, score, event count, recovery channel, complication, or exposure source → error.
- `breakdown` without `treatmentRequired` → warning.
- `breakdown` with `restRecoverable` → warning.
- Treatment-gated recovery channel without `treatmentRequired` → warning.
- Franchise / wiki / branded object-number token in id or CP-neutral field → error.

### Projection (`projectPsychologicalResilienceReview`)

- Outputs: `exposureElevated`, `depletionAdvanced`, `complicationActive`, `minorComplicationBeforeBreakdown`, `treatmentGated`, `restRecoveryEligible`, `dutyReliabilityDegraded`.
- Deterministic thresholds: exposure ≥ 0.6 elevates; `depleted`+ bands advance depletion; complications before `breakdown` flag minor complication path.

## Acceptance

- [x] Stable operator fixture validates and projects low exposure.
- [x] Staged depletion fixture shows minor complications before breakdown with rest recovery eligible.
- [x] Treatment breakdown fixture gates treatment and blocks rest recovery.
- [x] Franchise token in label → validation error.
- [x] Sanitize drops invalid/duplicate-id entries; fixture round-trip stable.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/psychologicalResilienceRegistry.ts`                       |
| Tests  | `src/test/psychologicalResilienceRegistry.test.ts`                    |
| Plan   | `planning/spe-1615-psychological-resilience-registry-slice-1.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| GameState persistence + hydrate wire | SPE-1615 slice 2 | Registry anchor must land first |
| SPE-1908 cross-join into compose | SPE-1615 slice 2+ | No persisted map yet |
| Planning mirror UI | SPE-1615 slice 4+ | Mirror follows persistence pattern |
| Surveillance-tuning surfacing in mirror / weekly notes | SPE-2430 follow-up | Out of registry-only boundary |

## See also

- `planning/spe-848-surveillance-tuning-registry-slice-2.md` — persistence slice pattern for slice 2 follow-up
- `planning/spe-1908-cross-system-reconciliation-slice-3.md` — surveillance-tuning cross-join (shipped)
- `architecture/fatigue-stress-exhaustion-multi-axis.md` — SPE-130 sibling stress model
