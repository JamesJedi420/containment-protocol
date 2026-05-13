# Complex Platform State and Resource Budgeting (SPE-92)

## Purpose

**Rare platforms** (heavy transports, carriers, siege engines, large drones, ritual barges) use a **unified state sheet** — not ordinary operative packets scaled up. Subsystems, envelopes, and crew dependencies are **first-class**.

## Unified state sheet (conceptual columns)

- **Movement resource** — fuel, charge, sail wind budget, or ritual propulsion counters.
- **Subsystem health** — mobility, sensors, weapons bus, power distribution, life support, ward lattice.
- **Directional defense** — facing arcs, active protection charges, CIWS cadence.
- **Targeting quality** — fire control solution state degraded by damage, weather, or EW.
- **Hardpoint readiness** — per-mount cooldowns, reload logistics, and **acquisition-gated** attacks (need track quality ≥ threshold).
- **Pending commitments** — queued shots, launches, or boarding actions consuming future ticks.

## Environmental envelope

**Operating envelope** degrades outside rated altitude, sea state, temperature, or occult stability — deterministic penalties or forced shutdown.

## Crew-role dependency

Critical subsystems may require **specific crew stations** manned; casualties or fatigue collapse capability bands.

## Non-destructive disablement

Prefer **disable / capture** branches (`architecture/large-asset-disable-capture.md`) — EMP burn, fouled screws, ritual sleep — with explicit repair timelines.

## Integration

- **SPE-90 pursuit** — platform family drives chase tables.
- **SPE-72 logistics** — platforms are also strategic transport nodes.

## Anti-patterns

- Single HP pool for entire carrier with no facing or subsystem consequence.

## See also

- `architecture/large-asset-disable-capture.md` — SPE-65
- `architecture/pursuit-chase-transit-hazards.md` — SPE-90
- `architecture/supply-network-strategic-nodes.md` — SPE-72
