# Crisis Packets, Pressure Maps, and Campaign Bootstrap (SPE-78)

## Purpose

Campaign setup begins from **compact crisis packets** and **relational pressure maps**, not flat stat builds. This is the **bootstrap grammar** for how the first weeks feel constrained, legible, and consequential.

## Crisis packets

A crisis packet is a bounded record that typically includes:

- **Inciting pressures** — funding cliff, legitimacy shock, faction ultimatum, containment debt, or political clock.
- **Broad competence domains** — what the agency is *allowed* to be good at day one vs what must be earned.
- **Explicit flaws** — mandatory weak spots (intel blind, logistics choke, doctrine gap) that cannot be papered over by “balanced” point buy.
- **Visible currencies** — resources the player can see and reason about (funds, trust chips, specialist slots, political cover).
- **Protagonist-interest checks** — authored prompts ensuring the opening arc has hooks for player agency, not only systemic decay.
- **Consequence-first doctrine** — anti–safety-net framing: early mistakes should propagate through pressure maps, not be auto-healed.

## Relational pressure maps

Pressure maps encode **edges** between actors, sites, and clocks:

- who benefits if the agency fails,
- which clocks advance each other,
- where deferral is expensive.

They are **relational**, not a single global “difficulty number.”

## Linked progress / consequence clocks

Bootstrap ties **progress clocks** (unlock windows, training pipelines) to **consequence clocks** (escalation, audit, rival moves). Completing arc milestones may trigger **arc-resolution identity revision** — sponsor relationship shifts, jurisdiction changes, or roster redefinition — as deterministic rewrites to starting assumptions.

## Integration

- **Persistence** — initial packet + map snapshot must version for migrations.
- **SPE-79 integrity** — bootstrap may seed integrity framing and vulnerability to dangerous methods.

## See also

- `architecture/integrity-drift-corruption-agency-loss.md` — SPE-79
- `architecture/background-packages-inherited-start-state.md` — SPE-83
- `planning/dependency-map.md`
