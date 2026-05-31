# SPE-1310 — Recurrent catastrophe amelioration registry slice 1

One-page implementation plan. Linear: [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) (child under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310)). Follows shipped [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) (naming-hazard descriptor registry).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2117 — Recurrent catastrophe amelioration registry — recurrence cycles and effect softening (slice 1)](https://linear.app/spectranoir/issue/SPE-2117) |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Case / facility lifecycle |
| **Branch** | `jamesdyedbq/spe-2117-recurrent-catastrophe-amelioration-registry-slice-1`                               |
| **Status** | **In Progress**                                                                                            |

## Goal

Add a pure deterministic **recurrent catastrophe amelioration registry** for anomalies that cannot be fully prevented — only prepared for, softened, repaired, and documented across repeating failure cycles.

## Prerequisite (on `main` @ `134b248e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Naming-hazard descriptors | `src/domain/namingHazardDescriptorRegistry.ts` (SPE-2116 / PR #2435) |
| Intake registry wave | SPE-2104–SPE-2116 sibling patterns                                       |
| Harvest batch        | `starter-picks-routing-65` (C35) in `planning/harvest-reconciliation-index.md` |

## Gap (pre-slice)

- No bounded schema for recurrence cadence, prevention ceiling, or active amelioration tactics.
- No deterministic validation for active prevention when ceiling is impossible.
- No next-recurrence severity projection helper.

## Scope (this slice)

| In                                                                                                                                 | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `RecurrentCatastropheId` + `RecurrentCatastropheRecord` in `src/domain/recurrentCatastropheAmeliorationRegistry.ts`                | GameState persistence                         |
| recurrenceCadence, failureMode, preventionCeiling, ameliorationTactics, preventionTactics, recurrenceCount, lastOccurrenceWeek      | SPE-1310 case lifecycle wire-up               |
| damageLedgerRefs, postIncidentReviewRefs                                                                                           | SPE-868 post-incident review wire-up          |
| `validateRecurrentCatastropheRecord(record)` — active prevention when ceiling impossible → error                                   | Full SPE-1310 parent Done                     |
| `projectNextRecurrenceRisk(record, policy)` — severity band forecast                                                               | SPE-1047 ethics routing                       |
| Focused tests in `src/test/recurrentCatastropheAmeliorationRegistry.test.ts`                                                       | Field UI                                      |

## Record contract (deterministic)

### Core fields

- **recurrenceCadence** — `weekly`, `monthly`, `seasonal`, `annual`, `irregular`.
- **failureMode** — `breach`, `manifestation`, `cascade`.
- **preventionCeiling** — `impossible`, `cost_prohibitive`, `unknown`.
- **ameliorationTactics** — `{ tactic, active }[]` for `shielding`, `evacuation`, `effect_dampening`, `repair_budget`, `narrative_containment`.
- **preventionTactics** — optional `{ tactic, active }[]` for `neutralization`, `source_elimination`, `permanent_seal`.
- **recurrenceCount** — non-negative integer.
- **lastOccurrenceWeek** — optional week index of last occurrence.
- **damageLedgerRefs / postIncidentReviewRefs** — audit hooks (field only in slice 1).
- **confidence / unknown / redacted** — projection legibility.

### Validation rules (examples)

- Missing `id` or `label` → error.
- Invalid union values, negative recurrenceCount → error.
- `preventionCeiling: impossible` with any active prevention tactic → error.
- `recurrenceCount` > 0 without non-empty `damageLedgerRefs` → warning.
- Franchise / wiki / branded object-number token → error.

### Projection (`projectNextRecurrenceRisk`)

- Inputs: record + optional policy (`currentWeek`, `minimumConfidence`, `redactUnknown`).
- Outputs: severity band (`dormant`, `elevated`, `imminent`, `critical`), risk score 0..1, active amelioration count.
- Deterministic: higher recurrenceCount + cadence elapsed raises band; active amelioration tactics soften score.

## Acceptance

- [x] Fixture: impossible prevention with active dampening + repair_budget tactics.
- [x] Fixture: recurrenceCount increments with damage ledger refs.
- [x] Negative: active prevention tactic when preventionCeiling impossible → error.
- [x] Repeated validation byte-stable.
- [x] `npm run lint` + targeted `npm run test:run` green.

## TDD order

1. **Schema + types** — unions, record shape, exported fixtures.
2. **Validation** — positive fixtures + prevention-ceiling negative.
3. **Projection** — `projectNextRecurrenceRisk` cadence and amelioration weighting.
4. **Regression** — sibling registry tests unchanged.

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/recurrentCatastropheAmeliorationRegistry.ts`              |
| Tests  | `src/test/recurrentCatastropheAmeliorationRegistry.test.ts`           |
| Plan   | `planning/recurrent-catastrophe-amelioration-registry-slice-1.md`     |

## Branch

`jamesdyedbq/spe-2117-recurrent-catastrophe-amelioration-registry-slice-1`

## Out of scope (parent closure)

- Full SPE-1310 parent Done
- GameState persistence and weekly orchestration wiring
- SPE-868 post-incident review integration, SPE-1047 ethics

## See also

- `planning/harvest-reconciliation-index.md` — adjacent intake tier row for SPE-2117
- `src/domain/namingHazardDescriptorRegistry.ts` — validation + projection conventions (SPE-2116)
