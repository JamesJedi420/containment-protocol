# Fortified Site Breach and Assault Layer (SPE-63)

## Purpose

**Fortified access** is a **distinct layer** from generic traversal cost. Barriers, barricades, and hardened entry points are **operational states** with breach methods, follow-on consequences, and installation-level objectives.

## Fortified state machine

Sites or sub-areas may be in:

- **Breach-required** — normal ingress blocked until a method succeeds.
- **Partially compromised** — one vector open; others still hot.
- **Reblocked** — defenders or auto-systems restore barrier integrity after a failed or partial breach.

## Breach approaches (varied, not a single roll)

Author **distinct breach methods** with different costs, signatures, and clocks, for example:

- Mechanical / thermal cutting, shaped charges, hydraulic spreaders.
- Social engineering, credential mimicry, or sanctioned key custody.
- Utility attacks — cutting power, venting steam, freezing locks — that trade speed for collateral or stability risk.

Each method should expose **detection risk**, **time**, **resource burn**, and **what opens next**.

## Directional anti-entry and entrapment

- **Directional traps** — fire lanes, cross-fields, deadfalls aimed at specific approach vectors.
- **Entrapment–release routes** — emergency exits that help defenders but expose attackers if misused; authoring should mark **who** may legally use them.

## Special insertion packages

Assault or insertion **packages** (vertical, subsurface, airborne, liminal) are authored bundles that interact with **spatial layers** (`architecture/spatial-layers-exposure.md`) and handoff contracts (SPE-64).

## Installation continuity objectives

High-stakes assaults should track objectives beyond “door open,” such as:

- **Utility continuity** — power, water, ventilation, data trunk for survivors or containment.
- **Lockdown integrity** — cell doors, blast doors, ritual seals.
- **Staff survival / evacuation** — civilian and non-combatant outcomes feed legitimacy and fallout.

## Integration

- **Mission resolution** — `fortified breach` style inputs already referenced; this doc is the design reference for those tags.
- **Collateral (SPE-55)** — breaching choices feed spillover channels.

## See also

- `architecture/spatial-layers-exposure.md`
- `systems/mission-resolution.md`
- `docs/cross-scale-integration.md`
