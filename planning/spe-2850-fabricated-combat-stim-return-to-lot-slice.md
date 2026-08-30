# SPE-2850 — Provenance-Preserving Fabricated Combat Stim Instance Return-to-Lot

| Field      | Value                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Status** | **Recently shipped**                                                                                                     |
| **Linear** | [SPE-2850](https://linear.app/spectranoir/issue/SPE-2850/provenance-preserving-fabricated-combat-stim-instance-return-to-lot) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)                  |
| **Branch** | `jamesdyedbq/spe-2850-fabricated-combat-stim-return-to-lot`                                                              |

## Boundary

This slice adds the guarded inverse of SPE-2849 fabricated-lot Combat Stim materialization. The player
may select one exact safe, stored, operational, full 2/2 Combat Stim identity that carries a valid
`fabricationOrigin` snapshot and is not claimed by recovery or overdrive provenance. Success deletes
only that registry identity, credits aggregate `combat_stims` inventory by exactly one, and decrements
the source lot's `trackedInstanceUnits` by exactly one. Lot production `quantity` stays the immutable
SPE-2800 receipt and is never mutated.

SPE-2845 catalog re-aggregation remains fail-closed for fabricated-origin identities
(`fabricated_provenance_required`). Catalog-origin identities continue to use that path only.

Missing or mismatched lots, tracked/quantity bound breaks, equipped/damaged/partial/depleted/recovery
cases fail closed with no partial mutation. Repeat/stale calls are idempotent (no second credit,
tracked decrement, or event).

Damaged return, partial-dose lot return, cross-lot grade migration, automated selection, and recovery
balancing remain out of slice. Auto-Scrap stays aggregate-only.

## Determinism and compatibility

- return command lives in `src/domain/combatStim.ts` beside re-aggregation and reuses lot canonical
  checks from `src/domain/sim/equipment.ts`;
- successful returns emit `equipment.combat_stim_reaggregated` with reason `fabricated_lot_return`,
  required 2/2 resource fields, and an all-or-none fabrication snapshot; catalog re-agg keeps
  `manual_untracking` with no fabrication fields;
- Combat Stim stored-copies UI surfaces `canReturnToLot` for eligible fabricated identities while
  generic `canReaggregate` stays false when provenance is present;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version remain unchanged
  unless hydration evidence requires otherwise.

## Deferred

| Item or mechanic                         | Owner or prerequisite | Reason                                        |
| ---------------------------------------- | --------------------- | --------------------------------------------- |
| Damaged-instance return                  | SPE-2851              | Condition conversion via stored repair, not damaged-aggregate credit |
| Partial/depleted dose lot return         | SPE-2852              | Keep fail-closed; disposal/recovery remain    |
| Cross-lot grade migration                | SPE-2827 child        | Return targets exact source lot only          |
| Automated lot or instance selection      | SPE-2749 child        | Auto-Scrap remains aggregate-only             |
| Repair, custody, readiness, mission loss | SPE-877 / SPE-1658    | Broader lifecycle authorities                 |
| Recovery balancing                       | SPE-1055              | Outputs and thresholds stay separately owned  |

## Validation

- success return (inventory +1, tracked −1, quantity unchanged; instance removed);
- catalog re-agg still rejects fabricated-origin;
- missing/mismatched lot, tracked &lt; 1, equipped/damaged/partial/depleted/recovery/overdrive,
  inventory overflow fail-closed;
- idempotent second call; event + hydration; UI eligibility/blocker;
- SPE-2849 materialize regression;
- focused tests, lint, repository verifiers, formatting, and full Vitest suite.
