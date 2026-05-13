# Subterranean Generation and Geology-Driven Topology (SPE-111)

## Purpose

**Underground spaces** (caves, mines, burrows, cut-and-cover works, utility megastructures) are generated from **terrain, geology, hydrology, builder archetype, and surface context** — not from one undifferentiated “cave pool.”

## Input drivers

- **Terrain** — surface elevation, slope stability, soil type.
- **Geology** — fault lines, voids, karst, hard rock vs sedimentary bands.
- **Hydrology** — aquifers, seasonal flood tables, sump behavior (`architecture/persistence-model.md` hydrology anchors).
- **Builder archetype** — natural, mined, creature-burrow, military-engineered, occult-excavated — each selects topology grammar and hazard tables.
- **Surface context** — urban basements vs wilderness sinkholes change entrance distributions.

## Outputs

- **Entrance states** — sealed, collapsed, hidden understructure, ritual-gated, seasonally exposed.
- **Topology grammar** — graph of chambers and links with **heading/grade** (ascent/descent, spiral, stepped), chokepoints, and ventilation shafts.
- **Access dependencies** — some branches require tools, pumps, or power before traversal is legal in-sim.

## Multi-entry networks

Support **deferred ingress discovery**: new entrances open when clocks, blasting, or hydrology shift — same network, evolving adjacency.

## Integration

- **SPE-108 tunnels** — engineered tunnels consume this grammar.
- **Spatial layers** — transition/interior bands align with `architecture/spatial-layers-exposure.md`.

## See also

- `architecture/siegeworks-fortification-destruction-tunnels.md` — SPE-108
- `architecture/spatial-layers-exposure.md` — SPE-57
- `architecture/persistence-model.md`
