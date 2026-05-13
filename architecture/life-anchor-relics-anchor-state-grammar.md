# Life-Anchor Relics — Anchor State Grammar (SPE-125)

## Purpose

This document is the **canonical design reference** for **life-anchor relics**: persistence of anchor binding, **break conditions**, **corruption grammar**, and interaction with custody, integrity, and anomaly systems.

## Issue routing

**SPE-128 (cursed life-anchor relics)** is a **duplicate**; all live design and implementation tracking should reference **SPE-125** only. Do not file new work against SPE-128.

## Anchor state (conceptual)

- **Binding strength** — how tightly the anchor couples to a person, place, or bloodline.
- **Corruption / drift** — graded deviation from intended function; may unlock forbidden affordances.
- **Break conditions** — authored explicit releases (destruction, ritual completion, renunciation, death of host).
- **Custody and provenance** — chain of evidence for who may legally wield or store the anchor (`architecture/persistence-model.md` custody framing).

## Integration

- **SPE-79 integrity** — dangerous anchors may erode integrity on use or proximity.
- **SPE-80 bound entities** — anchors may gate or leash autonomous entities.

## See also

- `architecture/integrity-drift-corruption-agency-loss.md` — SPE-79
- `architecture/bound-entities-risky-procedures.md` — SPE-80
- `SCHEMA_REGISTRY.md`
