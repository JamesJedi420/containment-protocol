# Permanent Gear Mutation and Station Interaction (SPE-113)

## Purpose

**Authored stations** may **permanently mutate concrete runtime items** under explicit **legality, resource, operator, and tradeoff** rules. The **same object identity** persists through storage, damage, trade, and later use — stations do not silently replace items with abstract “upgraded copies” that orphan history.

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
