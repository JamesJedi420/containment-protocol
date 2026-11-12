# SPE-1309 — Concept-state transformation registry slice 1

One-page implementation plan. Linear: [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118) (child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309)). Follows shipped [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) (recurrent catastrophe amelioration registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2118 — Concept-state transformation registry — relational state operators (slice 1)](https://linear.app/spectranoir/issue/SPE-2118) |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine |
| **Branch** | `jamesdyedbq/spe-2118-concept-state-transformation-registry-slice-1`                                     |
| **Status** | **In Progress**                                                                                            |

## Goal

Add a pure deterministic **concept-state transformation registry** for anomalies that operate on abstract relationships (inside/outside, membership, category) rather than physical objects alone.

## Prerequisite (on `main` @ `c784f806`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Recurrent catastrophe | `src/domain/recurrentCatastropheAmeliorationRegistry.ts` (SPE-2117 / PR #2436) |
| Self-censoring info  | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108) — symptom-first projection |
| Intake registry wave | SPE-2104–SPE-2117 sibling patterns                                       |
| Harvest batch        | `starter-picks-routing-65` (C20) in `planning/harvest-reconciliation-index.md` |

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `ConceptStateOperatorId` + `ConceptStateOperatorRecord` in `src/domain/conceptStateTransformationRegistry.ts`                      | GameState persistence                         |
| targetKind, operator, fromState, toState, scopeRules, collateralConceptRefs, detectionDifficulty                                   | SPE-1309 unified engine wire-up               |
| `validateConceptStateOperatorRecord(record)` — bind without scopeRules → warning; franchise token → error                          | Investigation UI for concept collateral     |
| `projectConceptCollateral(record, policy)` — symptom-first affected refs/roles                                                     | Full SPE-1309 parent Done                     |
| Focused tests in `src/test/conceptStateTransformationRegistry.test.ts`                                                           | Countermeasure integration                  |

## Record contract (deterministic)

### Core fields

- **targetKind** — `object`, `concept`, `relation`, `category`.
- **operator** — `relocate`, `invert`, `collapse`, `bind`.
- **fromState / toState** — CP-neutral relational state descriptors.
- **scopeRules** — bounded scope constraints for bind/collapse operators.
- **collateralConceptRefs** — related concept refs affected by transformation.
- **detectionDifficulty** — 0..1 unit score for operator observability.
- **confidence / unknown / redacted** — projection legibility without omniscient labels.

### Validation rules (examples)

- Missing `id` or `label` → error.
- Invalid union values, empty scope rule constraint → error.
- `operator: bind` without non-empty `scopeRules` → warning.
- Franchise / wiki / branded object-number token → error.

### Projection (`projectConceptCollateral`)

- Inputs: record + optional policy (`minimumConfidence`, `redactUnknown`, `suppressHiddenConflictLabels`).
- Outputs: affected refs with symptom descriptors and role hints — not hidden conflict truth labels.
- Deterministic mapping from operator + state transition to collateral symptom text.

## Acceptance

- [x] Fixture: concept relocate with collateralConceptRefs.
- [x] Fixture: category bind with scopeRules.
- [x] Negative: franchise label in operator id → error.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + bind-without-scope warning.
3. **Projection** — `projectConceptCollateral` symptom-first collateral list.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/conceptStateTransformationRegistry.ts`                  |
| Tests  | `src/test/conceptStateTransformationRegistry.test.ts`               |
| Plan   | `planning/concept-state-transformation-registry-slice-1.md`           |

## Branch

`jamesdyedbq/spe-2118-concept-state-transformation-registry-slice-1`

## Out of scope (parent closure)

- Full SPE-1309 parent Done
- GameState persistence and weekly orchestration wiring
- Unified cognitive hazard engine countermeasures

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2118
- `src/domain/selfCensoringInformationRegistry.ts` — symptom-first projection conventions (SPE-2108)
