# Spatial Layers, Exposure Windows, and Site Geometry (SPE-57)

## Purpose

Operational play distinguishes **where** teams are in the world geometry, not only **which room ID** they occupy. Location is a **layered state machine** with exposure and concealment that feeds recon, routing, resolution, and reporting.

## Layer model

Distinguish at minimum:

1. **Exterior / approach** — ingress lanes, observation from outside, weather and perimeter sensors.
2. **Transition bands** — thresholds, airlocks, chokepoints, checkpoints, and liminal connectors between outside and inside.
3. **Interior structure** — rooms, corridors, subdivisions at the same nominal depth, and disconnected internal levels.

**Hidden connectors** (maintenance shafts, floodgates, service spines, false panels) are **first-class routes**: they affect pathing, surprise, and evidence chains — not easter-egg shortcuts.

## Tactical geometry abstractions

- **Vertical overwatch** — elevation lanes change who sees whom first; stairs, shafts, and galleries matter.
- **Defensible pockets** — fallback rooms, hardened corners, or anchor points that modify resolution or survival.
- **Cover classes** — coarse deterministic buckets (none / soft / hard / sealed) instead of per-pixel simulation.
- **Frontage** — how much of a formation or asset is exposed to a threat axis (ties to aggregate battle and ingress modifiers where used).
- **Terrain overlays** — mud, ice, smoke, floodwater, or debris modify movement and visibility bands without a full physics engine.

## Visibility and light

- **Viewpoint-dependent concealment** — the same object may be hidden from one approach vector and silhouetted from another; encode as explicit viewpoint or sector tags, not a single global “hidden” flag.
- **Low-light advantage / bright-light reversal** — night favors infiltration or concealment until high-output lighting flips the band (searchlights, arc flashes, burning structures).
- **Environment-modified light** — smoke, dust, steam, or anomalous glow change effective visibility windows deterministically from environmental state.

## Integration

- **Scouting / recon** modifiers should consume spatial layer + visibility fields (see `docs/scouting-recon-audit.md` for existing `siteLayer`, `visibilityState`, ingress patterns).
- **Mission resolution** uses exposure to drive weakest-link penalties, collateral risk, and clock pressure.

## Anti-patterns

- Flattening all sites to “adjacent room graph” without transition or exterior state.
- Single global concealment score with no approach or lighting context.

## See also

- `docs/scouting-recon-audit.md`
- `architecture/persistence-model.md` — large complex guardrails
