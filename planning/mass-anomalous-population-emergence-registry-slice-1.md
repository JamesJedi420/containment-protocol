# SPE-2122 — Mass anomalous population emergence registry slice 1

One-page implementation plan. Linear: [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) (child under [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109)). Follows shipped [SPE-2121](https://linear.app/spectranoir/issue/SPE-2121) (alternate-reality threshold route registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2122 — Mass anomalous population emergence registry — registration, triage, and governance surge (slice 1)](https://linear.app/spectranoir/issue/SPE-2122) |
| **Parent** | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) — Public disclosure state registry |
| **Branch** | `jamesdyedbq/spe-2122-mass-anomalous-population-emergence-registry-registration` |
| **Status** | **In Progress** |

## Goal

Add a pure deterministic **mass anomalous population emergence registry** for single events that instantly create large newly anomalous public populations requiring registration, education, triage, rights review, and security surge capacity.

## Prerequisite (on `main` @ `0c375c93`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Threshold routes     | `src/domain/alternateRealityThresholdRouteRegistry.ts` (SPE-2121 / PR #2440) |
| Public disclosure    | `src/domain/publicDisclosureStateRegistry.ts` (SPE-2109 / PR #2430) |
| Harvest batch        | `starter-picks-routing-65` (C50) in `planning/harvest-reconciliation-index.md` |

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `PopulationEmergenceId` + `PopulationEmergenceRecord` in `src/domain/massAnomalousPopulationEmergenceRegistry.ts`              | GameState persistence                         |
| emergenceMagnitudeBand, newlyAnomalousCountEstimate, registrationBacklogWeeks, governanceMode, triageLanes, rightsReviewQueueRefs, publicEducationBurden, securitySurgeRefs | SPE-2109 disclosure state machine wire-up     |
| `validatePopulationEmergenceRecord(record)` — global + secrecy_restore warning; national without security surge warning; token guards | SPE-1046 affiliation bulk updates             |
| `projectGovernanceSurge(record, policy)` — institutional capacity forecast with governance-mode education elevation               | Full SPE-2109 parent Done                     |
| Focused tests in `src/test/massAnomalousPopulationEmergenceRegistry.test.ts`                                                       | Live population simulator                     |

## Record contract (deterministic)

### Core fields

- **emergenceMagnitudeBand** — `local`, `regional`, `national`, `global`.
- **newlyAnomalousCountEstimate** — non-negative integer population estimate.
- **registrationBacklogWeeks** — non-negative weeks of registration backlog.
- **governanceMode** — `secrecy_restore`, `managed_disclosure`, `collapsed_masquerade`.
- **triageLanes** — non-empty string lane identifiers for positive managed-disclosure fixtures.
- **rightsReviewQueueRefs** — optional ordered queue refs.
- **publicEducationBurden** — unit score 0..1.
- **securitySurgeRefs** — optional surge capacity refs.
- **confidence / unknown / redacted** — projection legibility without omniscient labels.

### Validation rules (examples)

- Missing `id` or `label` → error.
- Invalid union values → error.
- `global` magnitude with `secrecy_restore` governance → warning.
- `national` magnitude with empty `securitySurgeRefs` → warning.
- Franchise / wiki / branded object-number token in id/label/nested refs → error.

### Projection (`projectGovernanceSurge`)

- Inputs: record + optional policy (`currentWeek`, `minimumConfidence`, `redactUnknown`, `suppressHiddenConflictLabels`).
- Outputs: surge band, capacity pressure scores, triage lane symptom entries, and **effective** public education burden (elevated under `collapsed_masquerade`).
- Deterministic mapping from magnitude + governance mode + backlog to institutional capacity forecast.

## Acceptance

- [x] Fixture: managed_disclosure with registration backlog and triage lanes.
- [x] Fixture: collapsed_masquerade elevates publicEducationBurden in projection.
- [x] Negative: national magnitude with no securitySurgeRefs → warning.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + global/secrecy warning + national/surge warning.
3. **Projection** — `projectGovernanceSurge` with governance-mode education elevation.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/massAnomalousPopulationEmergenceRegistry.ts`            |
| Tests  | `src/test/massAnomalousPopulationEmergenceRegistry.test.ts`         |
| Plan   | `planning/mass-anomalous-population-emergence-registry-slice-1.md`  |

## Branch

`jamesdyedbq/spe-2122-mass-anomalous-population-emergence-registry-registration`

## Boundary notes

| Related issue | Relationship |
| ------------- | ------------ |
| [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) | Parent — public disclosure awareness and normalization inputs; wire-up deferred. |
| [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Myth/truth split — pairs conceptually, no runtime coupling this slice. |
| [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Affiliation bulk updates deferred. |
| [SPE-2141](https://linear.app/spectranoir/issue/SPE-2141) | Mass population **transport** incident registry — logistics surge, not emergence registration. |

## Out of scope (parent closure)

- Full SPE-2109 parent Done
- Disclosure state machine wire-up
- SPE-1046 affiliation bulk updates

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2122
- `src/domain/alternateRealityThresholdRouteRegistry.ts` — immediate predecessor registry conventions (SPE-2121)
- `planning/alternate-reality-threshold-route-registry-slice-1.md` — predecessor slice pattern
