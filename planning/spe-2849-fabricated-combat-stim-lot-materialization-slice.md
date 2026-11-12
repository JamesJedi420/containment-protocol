# SPE-2849 — Fabricated-Lot Combat Stim Instance Materialization Provenance

| Field      | Value                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Status** | **Recently shipped**                                                                                                     |
| **Linear** | [SPE-2849](https://linear.app/spectranoir/issue/SPE-2849/fabricated-lot-combat-stim-instance-materialization-provenance) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)                  |
| **Branch** | `jamesdyedbq/spe-2849-fabricated-combat-stim-lot-materialization`                                                        |

## Boundary

This slice materializes one exact Combat Stim identity from catalog stock or a selected fabricated
lot while retaining lot grade provenance together with the canonical 2/2 dose payload. Author one
Combat Stim production recipe so fabricated lots can exist in play. Success on the lot path
atomically decrements aggregate `combat_stims` inventory, increments that lot's
`trackedInstanceUnits` (production `quantity` stays the immutable SPE-2800 receipt), and creates one
stored operational Combat Stim with canonical 2/2 payload plus an immutable `fabricationOrigin`
snapshot. Catalog materialization omits the snapshot (existing behavior).

SPE-2845 catalog Combat Stim re-aggregation fails closed when `fabricationOrigin` is present.
Combat Stim recovery remains instance-only; fabricated-lot recovery sources stay unavailable for
Combat Stim. Equip-from-aggregate continues as catalog-origin materialization without lot
provenance.

Damaged return, fabricated Combat Stim return-to-lot, partial-dose re-aggregation, generic
non-Combat payload invent, Auto-Scrap instance selection, and repair remain out of slice.

## Determinism and compatibility

- materialization source projection reuses `resolveEquipmentDeconstructionSources` for catalog and
  lot quantity (Combat Stim recovery profile still marks aggregate sources unavailable for recovery);
- Combat Stim may carry payload + matching lot origin through instantiate, hydration, and events;
  ordinary payload + fabricationOrigin remains fail-closed;
- successful lot materialization emits `equipment.instance_materialized` with 2/2 resource fields
  and all-or-none fabrication fields; catalog Combat Stim materialization keeps 2/2 fields only;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version remain unchanged
  unless hydration evidence requires otherwise.

## Deferred

| Item or mechanic                         | Owner or prerequisite | Reason                                  |
| ---------------------------------------- | --------------------- | --------------------------------------- |
| Fabricated Combat Stim return-to-lot     | [SPE-2850](https://linear.app/spectranoir/issue/SPE-2850) (in progress) | Inverse of this materialize path |
| Damaged-instance return                  | SPE-877 / child       | Condition conversion separately owned   |
| Partial-dose re-aggregation              | SPE-2827 child        | Specialized stock / disposal / recovery |
| Automated lot or instance selection      | SPE-2749 child        | Auto-Scrap remains aggregate-only       |
| Repair, custody, readiness, mission loss | SPE-877 / SPE-1658    | Broader lifecycle authorities           |

## Validation

- recipe completes into a `combat_stims` fabricated lot;
- lot materialize success (inventory −1, tracked +1, quantity unchanged, 2/2 + origin);
- catalog Combat Stim materialize omits origin;
- SPE-2845 re-agg rejects fabricated-origin; ordinary SPE-2846/2848 regressions;
- hydration/event dual-field accept for Combat Stim; ordinary payload+fabrication reject;
- UI Track sources for Combat Stim catalog + lot;
- focused tests, lint, repository verifiers, formatting, and full Vitest suite.
