# Tiered detection / reveal payloads — slice 2 integration (SPE-781)

## Shipped status

| Field             | Value                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Linear**        | [SPE-781 — Tiered detection and reveal payloads](https://linear.app/spectranoir/issue/SPE-781)                          |
| **Merged PR**     | [#2342](https://github.com/JamesJedi420/containment-protocol/pull/2342) — shipped with slice 1 in one merge             |
| **Depends on**    | Slice 1 `revealPayload.ts` resolver (conceptual ordering; both landed in PR #2342)                                      |
| **Shipped scope** | Scouting integration via `revealPayloadScoutingIntegration.ts` without changing scouting outcome bands or modifier math |
| **Validation**    | `revealPayloadScoutingIntegration.test.ts`; PR #2342 — `npm run lint`, `npm run test:run`                               |

## Goal (implemented)

Wire the slice-1 reveal-payload resolver into **one existing contested-resolution path** (`resolveScouting`) without changing scouting outcome bands or modifier math.

Players and reports can consume tiered `DetectionScanResult` fields alongside the legacy `revealed` / `withheld` booleans.

## Scope (this slice)

| In                                                                                   | Out                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `buildSubjectTruthFromScouting` — map scouting inputs to `SubjectTruthState`         | Full hidden-modality matrix (SPE-70 doc)         |
| `scoutingOutcomeToDetectionScan` — derive `DetectionScanInput` from scouting outcome | UI / report copy for tier labels                 |
| `resolveScoutingWithRevealPayload` — compose scouting + tiered scan                  | Equipment scan families                          |
| Integration tests in `src/test/revealPayloadScoutingIntegration.test.ts`             | Changing `resolveScouting` signature or behavior |

## Shipped acceptance evidence

- [x] Strong/success scouting yields deeper scan families than fail/catastrophic withhold paths
- [x] High anomaly concealment adds deterministic concealment layers that block identity tiers
- [x] `resolveScoutingWithRevealPayload` returns unchanged `outcome` / `revealed` / `withheld` vs plain `resolveScouting`
- [x] `npm run test:run` and `npm run lint` green (integration tests only)

## See also

- `planning/reveal-payload-slice-1.md`
- Linear [SPE-781](https://linear.app/spectranoir/issue/SPE-781)
- `src/domain/scoutingResolution.ts` (SPE-59)
- `docs/unknown-interaction-runtime.md`
