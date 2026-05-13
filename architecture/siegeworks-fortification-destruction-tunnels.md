# Siegeworks, Fortification Destruction, and Hidden Tunnels (SPE-108)

## Purpose

**Walls, gates, towers, drawbridges, gatehouses, and tunnels** are **active infrastructure objects** with **independent durability**, **directional assault difficulty**, **layered defenses**, and **post-destruction terrain change** — not static scenery or a single HP bar for “the wall.”

## Per-object state

- **Segment or element identity** — gate leaf, curtain wall section, tower level, bridge span.
- **Durability / breach stage** — partial damage alters defense tables and creates rubble hazards.
- **Directional penalties** — assault difficulty varies by facing, elevation, and siege engine arc.
- **Layered gatehouse** — outer ward, inner portcullis, murder holes — each may have its own breach threshold and enfilade bonuses.
- **Anti-ladder / anti-climb tools** — deterministic counters until disabled or bypassed.

## Hidden tunnels

- **Covert tunnel routes** — pre-authored or discovered via probe; **emergence** changes control and witness profiles (`architecture/district-scheduling-urban-cadence-witness-density.md`).
- **Tunneling under fire** — progress clocks with collapse risk and countermine responses.

## Material-aware destruction

Damage respects **material graphs** (stone, wood, reinforced concrete, occult lattice) — different tools, times, and collateral footprints (`architecture/asymmetric-infrastructure-raid-state.md`).

## Repeated breach work

Breaches may **partially hold** then be **reblocked** (timber bracing, rubble fill, ritual seal). Multiple breach cycles are normal for long sieges.

## Route changes post-destruction

Collapsed sections alter **ingress flags**, **movement denial**, and **civilian evacuation** paths; update spatial context consumed by aggregate battle and pursuit layers.

## See also

- `architecture/fortified-site-breach-assault.md` — SPE-63
- `architecture/asymmetric-infrastructure-raid-state.md` — SPE-91
- `docs/aggregate-battle-audit.md` — SPE-106
