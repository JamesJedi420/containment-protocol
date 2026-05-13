# Runtime Episode Assembly and Scene-End Trigger Recognition (SPE-160)

## Purpose

Episodes and scenes are composed from **modular parts** at runtime and end through **recognized triggers**, not only elapsed time or pre-scripted sequences. Critical beats should preserve **in-control presentation** even when structure is guided.

## Modular scene parts

Scenes assemble from:

- **location packet** — topology, hazards, service nodes, understructure.
- **cast packet** — actors, roles, current dossiers (SPE-158).
- **agenda packet** — scene goals and exit criteria (SPE-153).
- **relationship packet** — relevant ties and conflicts.

These parts are selected based on current campaign and hub state.

## Scene-end trigger recognition

Scenes end when:

- agenda questions are answered,
- key exits are used,
- failure conditions are met,
- or explicit scene-end cards fire (SPE-153).

Recognition is based on state and events, not only timers.

## Waypoint vs local execution

High-level **waypoints** (reach site, confront contact, escape) exist separately from **low-level free execution** (exact path, micro-choices). Episodes advance via waypoint completion while leaving tactical detail under player / AI control.

## In-control presentation

For critical beats, keep:

- player agency over major choices,
- clear exposition of stakes and changes,
- minimal unskippable cutscene time.

## See also

- `architecture/scene-control-deck-state-subplot-pressure.md` — SPE-153
- `architecture/actor-dossiers-lineage-snapshots.md` — SPE-158

