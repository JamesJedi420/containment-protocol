# Pursuit, Chase, and Transit Hazards (SPE-90)

## Purpose

**Chases** resolve through **bounded distance bands** and **hazard beats**, not freeform map-by-map micromovement every frame. Transit hazards interact with **platform families**, **crew actions**, and **environment**.

## Distance and state bands

Use a compact band model (e.g., `contact | close | mid | far | lost`) with deterministic transitions driven by speed deltas, road quality, and interference.

## Hazard beats

Each tick or phase, apply **hazard beats**: traffic, pedestrian risk, roadblock, spike strip, low bridge, anomaly bleed. Beats consume crew attention and may damage platforms or injure occupants.

## Platform-family modifiers

Cars, boats, VTOL, foot, and mounted formations each declare **baseline transition tables**, crew capacity, and **interception vulnerability**.

## Mounted systems

Mounts add **burst speed** and **terrain access** but new failure modes (throw, fatigue, animal panic).

## Interception and boarding

At **close/contact** bands, resolve interception contests leading to **boarding**, **forced stop**, or **weapons free** branches with explicit legitimacy tags.

## Weather, terrain, visibility

Fog, ice, flooding, or smoke shift band transition weights and sensor reliability — ties to `architecture/spatial-layers-exposure.md` where relevant.

## Terminal outcomes

**Crash**, **capture**, **escape clean**, **escape damaged**, **handoff to scene** (chase ends in confrontation packet — `architecture/local-confrontation-odds-bands.md`).

## Chase-to-scene handoff

When pursuit ends on foot or at a site threshold, emit a **structured handoff** into site or encounter resolution without losing deterministic state.

## See also

- `architecture/large-asset-disable-capture.md` — SPE-65
- `architecture/spatial-layers-exposure.md` — SPE-57
- `architecture/local-confrontation-odds-bands.md` — SPE-73
