# Structured Room-Key Records (SPE-135)

## Purpose

**Keyed rooms** are authored as **layered structured records**, not one prose paragraph per space. Layers compose into **composite room state** for simulation, validation, and tooling.

## Layer model

| Layer | Contents |
| --- | --- |
| **Immediate sensory read** | What glance/hear/smell passes yield; may lie if glamoured. |
| **Floor / terrain** | Materials, slope, water, debris, cover-class stubs. |
| **Hazard layer** | Environmental, structural, occult hazards with clocks. |
| **Denizen layer** | Actors, dormant threats, civilian-density hooks. |
| **Hidden / discoverable** | Secret doors, false walls, sealed evidence, SPE-126-class traps. |
| **Room-local tables** (optional) | Encounter draws, loot discipline, inspection outcomes scoped to this key. |

## Fixtures and evidence

- **Interactive fixtures** — valves, altars, terminals — own mini state machines.
- **Map fragments** — partial topology reveals that merge into player map projections.
- **Object-class evidence finds** — tag-driven spawns (“blood_class_B”, “shell_casing_set”) with custody hooks.

## Composite state

Rooms may enter **composite states** (`flooded+dark`, `ritually_sealed+occupied`) by **tag intersection** rules with deterministic precedence — avoid unstructured prose-only descriptions in machine-readable authoring.

## Validation

Lint for missing mandatory layers, orphan triggers, or contradictory hazard + denizen tags.

## Integration

- **SPE-71 triggers** — attach to layers explicitly.
- **SPE-131 multi-team** — per-layer visibility per faction when authored.

## See also

- `architecture/hidden-search-diminishing-retries.md` — SPE-136
- `architecture/site-trigger-authoring-kernel.md` — SPE-71
- `architecture/concurrent-multi-team-site-state.md` — SPE-131
- `SCHEMA_REGISTRY.md` — SPE-47 governance
