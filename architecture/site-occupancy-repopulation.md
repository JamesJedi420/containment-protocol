# Site Occupancy, Roaming Pressure, and Repopulation (SPE-61)

## Purpose

Sites are **persistent places**, not one-shot encounter tubes. This document defines **explicit simulation channels** for who is on site, how pressure moves them, when new threats appear, and how returns differ from first clears.

## Explicit channels (keep separate)

| Channel | Role |
| --- | --- |
| **Site-bound occupancy** | Who is *currently* instantiated on-map vs deferred off-map. |
| **Roaming pressure** | Forces that push entities between zones or into player contact without instant teleport. |
| **Deferred / lazy placement** | Entities exist in pools but are not materialized until triggers fire (line of sight, alarm, clock). |
| **Deterministic repopulation** | Refill rules keyed to week, fallout, faction agenda, or player actions — **not** naive global respawn timers. |

## Stocking and ecology

- **Sparse stocking doctrine** — default to **thin** presence with high variance; overcrowding is authored, not accidental.
- **Finite wandering pools** — cap how many roamers can exist without reinforcement events.
- **Reinforcement linkage** — alarms, faction callbacks, or anomaly surges pull from **linked pools** with traceable IDs.
- **Mixed ecology** — **labor, security, civilian, and non-human** populations share occupancy budgets with explicit tags.
- **Adaptive return-state** — revisiting after partial clear, escalation, or faction shift should change **composition**, not only HP.

## Persistent local memory

Sites remember **damage, evidence left, traps tripped, bodies moved, doors welded** unless a authored reset clears them. Repopulation must **respect** that memory or explain deterministic repair.

## Reporting / provenance

Surface whether a threat was:

- **Static** (placed at generation),
- **Roaming** (spawned from pressure),
- **Newly placed** (lazy placement fired),
- **Repopulated** (deterministic refill from pool),

so players and auditors can read **why** something appeared.

## Integration

- **Large complex guardrails** — `architecture/persistence-model.md`
- **Mission resolution** — occupancy / roaming already listed as inputs where applicable.

## Anti-patterns

- Single encounter stream with no distinction between static and reinforced threats.
- Infinite respawn with no causal chain.

## See also

- `architecture/persistence-model.md`
- `systems/mission-resolution.md`
