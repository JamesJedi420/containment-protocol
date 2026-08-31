# SPE-2828 — Ordinary Equipment Instance Registry and Loadout Assignment Foundation

| Field      | Value                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                                             |
| **Linear** | [SPE-2828](https://linear.app/spectranoir/issue/SPE-2828/ordinary-equipment-instance-registry-and-loadout-assignment-foundation) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)                          |
| **Branch** | `jamesdyedbq/spe-2828-ordinary-equipment-instance-foundation`                                                                    |

## Boundary

This slice adds an optional `GameState.equipmentInstances` registry keyed by immutable, stable
instance IDs. Each object references a canonical equipment definition, has an authoritative
stored or exact agent/slot location, carries `operational` or `damaged` condition, and may carry
a safe resource ID plus exact integer capacity and remaining values.

Aggregate inventory remains authority only for uninstantiated quantities. Instantiation consumes
one aggregate unit atomically. Stored instances never return to aggregate stock, and instance-backed
unequip, replacement, and idle-agent transfer preserve identity without duplicating or crediting a
copy. Existing definition-only loadouts remain valid and retain their historical inventory behavior.

`Agent.equipmentSlots` remains the compatibility projection used by scoring and UI. Instance
location is authoritative, and instance commands plus hydration synchronize the projected
definition ID.

## Persistence and hydration

Legacy saves hydrate an empty registry. Hydration validates prototype-safe key/ID agreement,
known definitions and agents, allowed slots, condition, location, and payload bounds. Records are
processed by instance ID; the first equipped claim wins, later conflicts become stored, and the
winning instance projection overrides a conflicting legacy slot. Malformed siblings are dropped
without inventing definitions, payloads, or ownership.

The registry is optional, so `GAME_STORE_VERSION` and `GAME_SAVE_VERSION` remain unchanged.

## Deferred

- Combat Stim activation, exact two-dose depletion, and durable consumption events;
- SPE-1027 facility replenishment through a stock-provider port;
- SPE-1658 readiness/access states and SPE-877 maintenance or inspection;
- refill, loss, destruction, repair, mutation stations, arbitrary inventory credit, and
  instance-aware salvage;
- bespoke instance UI.

## Validation

- legal/malformed instance, location, condition, identity, and payload contracts;
- deterministic IDs and exactly one aggregate decrement;
- stored/equipped relocation, direct idle-agent transfer, slot gates, and occupied claims;
- compare-and-swap stale-state and immutable-identity enforcement;
- instance-backed unequip/replacement/transfer without aggregate credit;
- deterministic conflict hydration, legacy empty default, and JSON save round trip;
- unchanged definition-only loadouts, scoring, recovery, fabricated-lot provenance, Auto-Scrap,
  and Equipment UI behavior.
