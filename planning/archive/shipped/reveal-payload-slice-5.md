# Tiered detection / reveal payloads — slice 5 report copy (SPE-781)

## Prerequisite

Slice 4 on `main` @ `0486111` (PR #2346): `resolveAssignedCaseForWeek` exposes `behaviorValidation.detectionScan` alongside legacy disguise validation.

## Goal

Surface **tiered detection readouts** in player-facing weekly report copy using `detectionScan.fields[].playerFacingValue`, mirroring the pure-formatter pattern in `infiltrationEncounterReportNotes.ts` — without changing scan resolution, validation scores, detection-confidence math, or mission outcome logic.

## Scope (this slice)

| In | Out |
| --- | --- |
| `src/domain/detectionScanReportNotes.ts` — ordered `playerFacingValue` summary formatters | Full hidden-modality matrix (`architecture/hidden-state-displacement-counter-detection.md`) |
| `detectionScanTierOrder` + `playerFacingValue` only in player copy (no `internalValue`) | Changing `resolveDetectionScan` or `disguiseValidationToDetectionScan` |
| `advanceWeek` `resolveAssignments`: append scan line to `resolutionReasons` when validation is active | Replacing legacy `Behavior validation:` reason strings |
| Unit tests `src/test/detectionScanReportNotes.test.ts` | New React report components (use existing `explanationNotes` in `MissionResultSummary`) |
| Extend `src/test/advanceWeek.behaviorValidation.test.ts` for tier copy in weekly report snapshots | Scouting path (`resolveScoutingWithRevealPayload`) unless trivially shared formatters only |
| Optional: enrich `concealment.activated` summary when scan is already available deterministically | New event types or payload schema churn |

## Copy contract

- **Formatter module** (domain-only): `formatDetectionScanSummary(result)` joins scan field order and `playerFacingValue` clauses (e.g. `Detection readout: contact detected; unclassified contact; 2 concealed layers.`).
- **Emit when:** `behaviorValidation.active` and `detectionScan.fields.length > 0`; suppress redundant presence-only noise when validation is inactive unless tests/product require otherwise.
- **Legacy coexistence:** keep existing `Behavior validation: +N (...)` and scalar `detectionConfidence` on mission results; add scan readout as an **additional** explanation note via `resolutionReasons` → `buildMissionResult` → `explanationNotes`.
- **Optional suffix:** if `strippedLayerIds.length > 0`, append deterministic counter-detection peel hint (only when covered by tests).

## Acceptance

- [x] Strong hidden/disguise weekly resolution shows tiered readout in report `missionResult.explanationNotes` (not only legacy behavior-validation text)
- [x] Inactive / low-depth paths do not spam empty or duplicate “no contact” lines by default
- [x] Pre-slice behavior: validation scores, degrade hints, and mission outcome math unchanged (`revealPayloadOrchestration.test.ts` still green)
- [x] `npm run test:run` and `npm run lint` green on touched files
- [x] CP-native copy only (no franchise names or copyrighted setting labels)

## Implementation notes

1. `detectionScanReportNotes.ts` formats `DetectionScanResult.fields` in resolver order via `playerFacingValue` only.
2. Wire in `src/domain/sim/advanceWeek.ts` immediately after `resolutionReasons` is seeded (shared success / partial / fail / degrade paths).
3. Post-merge: update `planning/backlog.md` item #5 (slice 5 shipped; modality matrix remains follow-up).

## See also

- `planning/reveal-payload-slice-4.md`
- Linear [SPE-2254](https://linear.app/spectranoir/issue/SPE-2254) (child of [SPE-781](https://linear.app/spectranoir/issue/SPE-781))
- `src/domain/infiltrationEncounterReportNotes.ts` — formatter pattern
- `src/domain/revealPayloadDisguiseIntegration.ts`
- `src/domain/sim/advanceWeek.ts` — `resolveAssignments`
- `src/features/report/reportDetailHelpers.tsx` — `MissionResultSummary` / `explanationNotes`

## Out of scope (later)

- Full SPE-70 hidden-modality matrix
- False-detection / instrumentation attack modalities
- Dedicated event-feed tier metadata unless report notes prove insufficient
