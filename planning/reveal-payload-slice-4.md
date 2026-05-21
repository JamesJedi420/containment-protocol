# Tiered detection / reveal payloads — slice 4 orchestration (SPE-781)

## Prerequisite

Slices 1–3 on `main` @ `db0ed11` (PR #2342 / #2344): `revealPayload.ts`, scouting + disguise integration.

## Goal

Wire `evaluateBehaviorWeightedDisguiseValidationWithRevealPayload` into **`resolveAssignedCaseForWeek`** so weekly resolution strategies expose tiered `detectionScan` alongside legacy disguise validation — without changing validation scores, detection-confidence application, or mission outcome math.

## Scope (this slice)

| In | Out |
| --- | --- |
| `buildDisguiseRevealSubjectFromCase` — deterministic subject from case fields | Report / event-feed copy for tier labels |
| `resolveAssignedCaseForWeek` uses composed disguise + reveal helper | `advanceWeek` event drafts consuming `detectionScan` |
| `WeeklyCaseResolutionStrategy.behaviorValidation` carries optional `detectionScan` | Full hidden-modality matrix (SPE-70 doc) |
| Integration tests in `src/test/revealPayloadOrchestration.test.ts` | UI components |

## Acceptance

- [x] `resolveAssignedCaseForWeek` returns unchanged legacy validation fields vs pre-slice behavior
- [x] Hidden infiltration cases attach `detectionScan` with tier depth correlated to validation level
- [x] `applyBehaviorWeightedDisguiseValidationToCase` and score/outcome paths unchanged
- [x] `npm run test:run` and `npm run lint` green on touched files

## See also

- `planning/reveal-payload-slice-3.md`
- Linear child under [SPE-781](https://linear.app/spectranoir/issue/SPE-781)
- `src/domain/caseResolutionOrchestration.ts`
- `src/domain/revealPayloadDisguiseIntegration.ts`

## Follow-up (slice 5)

Shipped in `planning/reveal-payload-slice-5.md` — `detectionScanReportNotes.ts` + `advanceWeek` resolution reasons.
