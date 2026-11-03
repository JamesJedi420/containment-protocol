# SPE-1013: Unauthorized Enhancement Lifecycle

**Status:** Domain-only slice merged; full SPE-1013 remains Backlog

**Issue:** SPE-1013 - Unauthorized enhancement lifecycle

**Branch:** `jamesdyedbq/spe-1023-unauthorized-enhancement-lifecycle`

**PR:** #4343 (merged)

**Linear Issue:** https://linear.app/spectranoir/issue/SPE-1013

## Goal

Implement a bounded unauthorized-enhancement layer so hidden treatments can improve capability, create dependency, produce overdose, and collapse under exposure without cleanly fitting either medicine or poisoning alone.

## Scope

- Support illicit or unauthorized treatment programs running alongside official medicine inside institutions
- Support apparent restoration of cognition, mobility, art skill, perception, or other capabilities that exceed normal expectations
- Support hidden supply chains, patient hoarding, missing inventory, self-dosing, and secrecy around dosage control
- Support overdose clocks, acute collapse, and treatment thresholds where the same substance can help, amplify danger, or kill
- Support conflict between official treatment explanations and hidden enhancement mechanisms
- Support moral ambiguity where the unlawful helper is motivated by genuine care while still creating uncontrolled harm
- Distinguish unauthorized enhancement from standard prescriptions, simple doping, or one-off antidote use
- Connect the layer to care-facility degradation, perception gating, and administrative partial closure systems

## Constraints

- Deterministic only
- No full pharmacology simulator
- No assumption that improvement means safety or that official records are complete
- Prefer compact supply, effect, dependency, and overdose states over sprawling medical prose
- Keep current treatment source, dose state, and enhancement cost legible enough for planning and debugging

## Acceptance Criteria

- At least one hidden treatment changes a configured subject capability, condition, or vulnerability value in a way that alters the case branch or required investigation step
- At least one beneficiary conceals, hoards, or self-doses the unauthorized supply
- At least one overdose or instability event emerges from the same treatment that previously helped
- At least one official medical explanation remains incomplete because a parallel hidden treatment track exists
- Targeted tests cover deterministic enhancement, dependency, overdose, and exposure-collapse outcomes

## Implementation Status (2026-10-21 attribution correction)

### Delivered, not full-issue closure

- Merged [PR #4343](https://github.com/JamesJedi420/containment-protocol/pull/4343) delivers a pure deterministic domain layer in `src/domain/unauthorizedEnhancement.ts` with focused tests in `src/domain/unauthorizedEnhancement.test.ts`.
- The merged PR expressly excludes GameState, campaign/runtime, and UI wiring. Domain tests and merge alone do not certify the full issue's existing acceptance obligations or downstream case/investigation effects.
- This plan originally used **SPE-1023** by mistake. That Linear identifier belongs to the distinct response-team readiness/doctrine program. The correct Linear owner is **SPE-1013**. GitHub issue [#1023](https://github.com/JamesJedi420/containment-protocol/issues/1023) is the correct GitHub mirror of SPE-1013.

### Follow-up evidence and constraints

- Keep SPE-1013 Backlog until all acceptance requirements are demonstrated under the previously approved issue boundary.
- Cross-check the earlier approved issue history, including the 2026-05-01 capability-resource dependency comment, before claiming any additional integration obligation. This planning document is not independent authorization to broaden scope.
- No feature or gameplay source changes are included in this identity-correction pass.

## Historical implementation provenance

The original delegated implementation used branch `jamesdyedbq/spe-1023-unauthorized-enhancement-lifecycle` and merged as PR #4343. The historical branch name and merge evidence remain unchanged; only the canonical Linear issue attribution is corrected.
