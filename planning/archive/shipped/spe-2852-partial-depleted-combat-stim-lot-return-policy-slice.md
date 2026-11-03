# SPE-2852 — Partial/Depleted Combat Stim Fabricated Lot-Return Policy

| Field      | Value                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Status** | **Closed / docs-satisfied**                                                                                                    |
| **Linear** | [SPE-2852](https://linear.app/spectranoir/issue/SPE-2852/partialdepleted-combat-stim-fabricated-lot-return-policy)             |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)                        |
| **Branch** | `jamesdyedbq/spe-2852-partialdepleted-combat-stim-fabricated-lot-return-policy`                                                |

## Boundary

Docs-only close. Confirm the shipped policy that catalog re-aggregation (SPE-2845) and fabricated
lot-return (SPE-2850) remain fail-closed on `partial_dose` (1/2) and `depleted_dose` (0/2). Aggregate
credit remains exactly one full 2/2 Combat Stim unit, or the command fails closed. Incomplete
remaining must not credit into aggregate `combat_stims` stock that materializes as 2/2.

Disposal (SPE-2844) and depleted recovery (SPE-2830 / SPE-1055) remain the owners for non-full
remaining identities. No partial-unit aggregate inventory. Lot production `quantity` is never mutated
to represent remaining doses. No runtime, schema, or test-matrix changes in this slice.

## Determinism and compatibility

- Gates live in `src/domain/combatStim.ts`: `resolveCombatStimReaggregation` /
  `reaggregateStoredCombatStimInstance` and `resolveCombatStimReturnToLot` /
  `returnFabricatedCombatStimInstanceToLot`.
- Successful credit paths still require `remaining === COMBAT_STIM_CAPACITY` (2) and emit
  `equipment.combat_stim_reaggregated` with required 2/2 resource fields.
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and operation-event schema versions are unchanged.

## Deferred

| Item or mechanic                    | Owner or prerequisite | Reason                                              |
| ----------------------------------- | --------------------- | --------------------------------------------------- |
| Fill/replenish remaining doses      | SPE-1027 (new child)  | Facility stock authority; do not stretch SPE-2852   |
| Live-dose recovery balancing        | SPE-1055 (new child)  | Outputs and thresholds stay separately owned        |
| Damaged condition conversion        | SPE-2851 / SPE-877    | Separate; already shipped for stored repair         |

## Validation

- Existing contract matrix only (no new cases):
  - `src/test/combatStim.contract.test.ts` — re-agg fail-closed for partial/depleted + disposal available
  - same file — fabricated lot-return fail-closed for `partial_dose` / `depleted_dose`
- Docs: backlog handoff + this slice status; `npm run verify:backlog-handoff`
- No `src/` diff; no new tests
