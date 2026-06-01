# SPE-2121 — Alternate-reality threshold route registry slice 1

One-page implementation plan. Linear: [SPE-2121](https://linear.app/spectranoir/issue/SPE-2121) (child under [SPE-765](https://linear.app/spectranoir/issue/SPE-765)). Follows shipped [SPE-2120](https://linear.app/spectranoir/issue/SPE-2120) (media-contained event registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2121 — Alternate-reality threshold route registry — cross-layer edges and return rules (slice 1)](https://linear.app/spectranoir/issue/SPE-2121) |
| **Parent** | [SPE-765](https://linear.app/spectranoir/issue/SPE-765) — Anomalous route graphs and misrouting |
| **Branch** | `jamesdyedbq/spe-2121-alternate-reality-threshold-route-registry-cross-layer-edges` |
| **Status** | **Done** (PR #2440) |

## Goal

Add a pure deterministic **alternate-reality threshold route registry** for doorways, frames, and portals that transport actors between destination layers with explicit return rules, jurisdiction implications, and access authorization.

## Prerequisite (on `main` @ `00b194d8`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Media-contained events | `src/domain/mediaContainedEventRegistry.ts` (SPE-2120 / PR #2439) |
| Intake registry wave | SPE-2104–SPE-2120 sibling patterns                                       |
| Harvest batch        | `starter-picks-routing-65` (C18) in `planning/harvest-reconciliation-index.md` |

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `ThresholdRouteId` + `ThresholdRouteRecord` in `src/domain/alternateRealityThresholdRouteRegistry.ts`                            | GameState persistence                         |
| entryRef, destinationLayerId, returnRule, authorizationClass, jurisdictionHandoff, transitRisk, lostPersonRefs, roundTripScheduleRefs | SPE-765 anomalous route graph integration     |
| `validateThresholdRouteRecord(record)` — one_way with non-empty roundTripScheduleRefs → error; token guardrails on nested refs   | SPE-122 portal endpoint rules                 |
| `projectTransitAccountability(record, policy)` — population and evidence custody forecast                                         | Full SPE-765 parent Done                      |
| Focused tests in `src/test/alternateRealityThresholdRouteRegistry.test.ts`                                                         | Live route simulation / map rendering         |

## Record contract (deterministic)

### Core fields

- **entryRef** — non-empty ref anchoring the threshold on the origin layer.
- **destinationLayerId** — non-empty ref for the destination reality/layer.
- **returnRule** — `mandatory`, `optional`, `one_way`, `unknown`.
- **authorizationClass** — `public_threshold`, `credential_gated`, `clearance_bound`, `containment_only`.
- **jurisdictionHandoff** — `none`, `partial`, `full`, `disputed`.
- **transitRisk** — `low`, `high`, `lossy`.
- **lostPersonRefs** — optional ordered refs for persons unaccounted after transit.
- **roundTripScheduleRefs** — optional refs documenting scheduled round-trip operations.
- **confidence / unknown / redacted** — projection legibility without omniscient labels.

### Validation rules (examples)

- Missing `id` or `label` → error.
- Missing or empty `entryRef` / `destinationLayerId` → error.
- Invalid union values → error.
- `returnRule: one_way` with non-empty `roundTripScheduleRefs` → error (return policy conflict).
- `returnRule: unknown` with non-empty `roundTripScheduleRefs` → warning.
- Franchise / wiki / branded object-number token in id/label/nested refs → error.

### Projection (`projectTransitAccountability`)

- Inputs: record + optional policy (`currentWeek`, `minimumConfidence`, `redactUnknown`, `suppressHiddenConflictLabels`).
- Outputs: accountability band, jurisdiction symptom entries, lost-person custody forecast, and evidence-chain gap hints — symptom-first, not hidden route truth labels.
- Deterministic mapping from returnRule + transitRisk + jurisdictionHandoff to projected population/evidence risk scores.

## Acceptance

- [x] Fixture: optional return with jurisdictionHandoff.
- [x] Fixture: one_way route blocks return policy conflict.
- [x] Negative: unknown returnRule with scheduled round-trip ops → warning.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + one_way/mandatory conflict + unknown/round-trip warning.
3. **Projection** — `projectTransitAccountability` with deterministic custody/jurisdiction symptoms.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/alternateRealityThresholdRouteRegistry.ts`              |
| Tests  | `src/test/alternateRealityThresholdRouteRegistry.test.ts`           |
| Plan   | `planning/alternate-reality-threshold-route-registry-slice-1.md`    |

## Branch

`jamesdyedbq/spe-2121-alternate-reality-threshold-route-registry-cross-layer-edges`

## Boundary notes

| Related issue | Relationship |
| ------------- | ------------ |
| [SPE-122](https://linear.app/spectranoir/issue/SPE-122) | Portal classes and endpoint rules — generic gate infrastructure, throughput, false interfaces. **SPE-2121** focuses on cross-reality edge accountability (return rules, jurisdiction, lost persons). |
| [SPE-2149](https://linear.app/spectranoir/issue/SPE-2149) | Multidimensional transport **network** registry — layered route governance, fare rules, station queues. **SPE-2121** is a single threshold-edge record, not network topology. |
| [SPE-765](https://linear.app/spectranoir/issue/SPE-765) | Parent umbrella — route graph integration deferred until later slices. |

## Out of scope (parent closure)

- Full SPE-765 parent Done
- Anomalous route graph runtime wiring and misrouting simulation
- SPE-122 portal endpoint rules and SPE-2149 network registry implementation

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2121
- `src/domain/mediaContainedEventRegistry.ts` — latest registry validation/projection conventions (SPE-2120)
- `planning/media-contained-event-registry-slice-1.md` — immediate predecessor slice pattern
