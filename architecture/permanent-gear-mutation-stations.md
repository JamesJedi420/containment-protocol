# Permanent Gear Mutation and Station Interaction (SPE-113)

## Purpose

**Authored stations** may **permanently mutate concrete runtime items** under explicit **legality, resource, operator, and tradeoff** rules. The **same object identity** persists through storage, damage, trade, and later use — stations do not silently replace items with abstract “upgraded copies” that orphan history.

## Runtime first child (SPE-877)

Three authored stations are live: `blast_door_integrity_bench`, `pressure_seal_integrity_bench`, and `interlock_integrity_bench`. `applyBlastDoorIntegrityLabor` mutates a stored `blast_door` identity in place; `applyPressureSealIntegrityLabor` mutates a stored `pressure_seal` identity; `applyInterlockIntegrityLabor` mutates a stored `interlock` identity (`stationMutation` + `cycleCount` +1) without replacing the instance ID. Catalog re-aggregation and fabricated ordinary return-to-lot fail closed when that stamp is present so rematerialize cannot orphan history onto a new UUID. Hydration keeps a stamp only when it matches the instance class; mixed pairing and unknown station ids drop. Full SPE-113 tags, operators, black-market legality, and curse catalog remain design-only. See `planning/spe-877-mutation-stations-integrity-labor-slice.md`, `planning/spe-877-pressure-seal-integrity-bench-slice.md`, and `planning/spe-877-interlock-integrity-bench-slice.md`.

## Station contract

Each station declares:

- **eligible item tags** and forbidden combinations,
- **operator requirements** (role, cert, ritual standing),
- **resource inputs** (parts, reagents, facility slots),
- **legality checks** — sanctioned vs black-market outcomes,
- **bounded tradeoffs** — durability loss, curse risk, audit trail, sponsor notification.

## Mutation effects

Mutations rewrite **canonical item fields** (mods, flags, durability bands, ritual bindings) while preserving **stable item IDs** and provenance chains for reports and investigations.

## Persistence

Mutated items round-trip saves; downstream systems (loadout validation, weakest-link, evidence) read the **mutated** state without a parallel “shadow item.”

## Anti-patterns

- Treating mutation as a temporary buff that expires off-mission.
- Spawning a new item UUID for every upgrade tier without migration of custody records.

## See also

- `docs/gear-loadouts-audit.md`
- `architecture/integrity-drift-corruption-agency-loss.md` — SPE-79
- `systems/mission-resolution.md`
