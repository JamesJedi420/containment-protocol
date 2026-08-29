# SPE-2848 — Provenance-Preserving Fabricated Ordinary-Equipment Instance Return-to-Lot

| Field      | Value                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | **In Progress**                                                                                                                  |
| **Linear** | [SPE-2848](https://linear.app/spectranoir/issue/SPE-2848/provenance-preserving-fabricated-ordinary-equipment-instance-return-to) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)                          |
| **Branch** | `jamesdyedbq/spe-2848-fabricated-ordinary-return-to-lot`                                                                         |

## Boundary

This slice adds the guarded inverse of SPE-2846 fabricated-lot ordinary materialization. The player
may select one exact safe, stored, operational, payload-free, non-Combat-Stim identity that carries
a valid `fabricationOrigin` snapshot and is not claimed by recovery. Success deletes only that
registry identity, credits aggregate inventory by exactly one, and decrements the source lot's
`trackedInstanceUnits` by exactly one. Lot production `quantity` stays the immutable SPE-2800
receipt and is never mutated.

SPE-2843 catalog re-aggregation remains fail-closed for fabricated-origin identities
(`fabricated_provenance_required`). Catalog-origin identities continue to use that path only.

Missing or mismatched lots, tracked/quantity bound breaks, equipped/damaged/payload/Combat/recovery
cases, and catalog-origin identities on the return command fail closed with no partial mutation.
Repeat/stale calls are idempotent (no second credit, tracked decrement, or event).

Combat Stim / payload fabricated return, damaged return, repair, cross-lot grade migration,
automated selection, and recovery balancing remain out of slice. Auto-Scrap stays aggregate-only.

## Determinism and compatibility

- return command lives beside lot materialization in `src/domain/sim/equipment.ts` and reuses lot
  canonical checks plus instance safety gates;
- successful returns emit `equipment.instance_reaggregated` with reason `fabricated_lot_return` and
  an all-or-none fabrication snapshot (queue/recipe/grade/week); catalog re-agg keeps
  `manual_untracking` with no fabrication fields;
- Equipment UI surfaces `canReturnToLot` for eligible fabricated identities while generic
  `canReaggregate` stays false when provenance is present;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version remain unchanged
  unless hydration evidence requires otherwise.

## Deferred

| Item or mechanic                         | Owner or prerequisite | Reason                                        |
| ---------------------------------------- | --------------------- | --------------------------------------------- |
| Damaged-instance return                  | SPE-877 / child       | Condition conversion remains separately owned |
| Combat Stim / payload fabricated return  | SPE-2827 child        | Specialized payload policy                    |
| Cross-lot grade migration                | SPE-2827 child        | Return targets exact source lot only          |
| Automated lot or instance selection      | SPE-2749 child        | Auto-Scrap remains aggregate-only             |
| Repair, custody, readiness, mission loss | SPE-877 / SPE-1658    | Broader lifecycle authorities                 |
| Recovery balancing                       | SPE-1055              | Outputs and thresholds stay separately owned  |

## Validation

- success return (inventory +1, tracked −1, quantity unchanged; instance removed);
- catalog re-agg still rejects fabricated-origin;
- missing/mismatched lot, tracked &lt; 1, equipped/damaged/payload/Combat/recovery, catalog-origin
  on return, inventory overflow fail-closed;
- idempotent second call; event + hydration; UI eligibility/blocker;
- SPE-2846 materialize regression;
- focused tests, lint, repository verifiers, formatting, and full Vitest suite.
