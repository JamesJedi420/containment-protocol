# Tiered detection / reveal payloads — slice 3 integration (SPE-2252)

## Prerequisite

Merge [PR #2342](https://github.com/JamesJedi420/containment-protocol/pull/2342) (SPE-781 slices 1–2 on `main`).

## Goal

Wire the reveal-payload resolver into **behavior-weighted disguise validation** (`evaluateBehaviorWeightedDisguiseValidation`) without changing validation scores, `detectionConfidence` math, or `applyBehaviorWeightedDisguiseValidationToCase`.

Callers can consume tiered `DetectionScanResult` alongside legacy validation fields.

## Scope (this slice)

| In | Out |
| --- | --- |
| `buildSubjectTruthFromDisguise` — map case + subject to `SubjectTruthState` | Orchestration wiring in `resolveAssignedCaseForWeek` |
| `disguiseValidationToDetectionScan` — derive `DetectionScanInput` from validation level | UI / report copy for tier labels |
| `evaluateBehaviorWeightedDisguiseValidationWithRevealPayload` | Changing `evaluateBehaviorWeightedDisguiseValidation` signature or behavior |
| Integration tests in `src/test/revealPayloadDisguiseIntegration.test.ts` | Full hidden-modality matrix (SPE-70 doc) |

## Acceptance

- [x] Strong validation yields deeper scan families than inactive / low-level paths
- [x] Infiltration awareness and weak document tier add deterministic concealment layers
- [x] Composed helper returns unchanged validation fields vs plain `evaluateBehaviorWeightedDisguiseValidation`
- [x] `npm run test:run` and `npm run lint` green (integration tests + targeted suite)

## See also

- `planning/reveal-payload-slice-2.md`
- Linear [SPE-2252](https://linear.app/spectranoir/issue/SPE-2252) (child of [SPE-781](https://linear.app/spectranoir/issue/SPE-781))
- `src/domain/disguiseValidation.ts`
- `src/domain/revealPayloadScoutingIntegration.ts`
