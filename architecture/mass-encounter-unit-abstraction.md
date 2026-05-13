# Mass encounter unit abstraction

## Source

Synced from Linear Containment Protocol project resource (2026-05-12). Git is canonical for ongoing edits. Original: [Linear doc](https://linear.app/spectranoir/document/mass-encounter-unit-abstraction-366066d8c9bd).

## See also

- `docs/aggregate-battle-audit.md` — deterministic aggregate battle implementation and campaign summaries.

## Scope

Covers hierarchical force abstraction for encounters where individuals roll up into larger operational formations, along with the command, formation, scale-bridging, and siege rules needed when battles stop behaving like ordinary skirmishes.

## Included issue boundaries

- SPE-385
- SPE-386
- SPE-387
- SPE-388
- SPE-389

## Core abstraction

- Individuals may roll up into squads, platoons, companies, and larger formation tiers without remaining fully discrete actors.
- Formation tiers should derive from underlying actor classes or templates rather than arbitrary standalone stats.
- Unit-scale state should preserve aggregate integrity, equipment grade, morale implications, and key exception tags.
- Compact roster-plus-tag formats are preferred for mass encounter readability.

## Command and communication

- Formations should not assume perfect battlefield awareness at any range.
- Command presence, radius, and communication channel quality matter.
- Valid communication surfaces include banners, instruments, line of sight, voice, or bounded magical signaling.
- Units outside command control should degrade into less coordinated behavior states rather than behaving as if perfectly directed.
- Declared movement and charge commitments may lock in before exact measurement, preserving commitment risk.
- Defenders may react during transit through interrupt fire or equivalent opportunity windows before a mover completes its path.

## Formation states

- Units may enter explicit tactical postures such as shield wall, pike block, mixed line, column, echelon, or equivalent authored formations.
- Formation entry should have requirements, directional benefits, movement costs, and break conditions.
- Frontage, facing, wheel, contraction, and expansion are operational state changes, not prose flavor.
- Narrow corridors, wider rooms, breach mouths, and similar geometry should cap frontage differently and protect or expose rear ranks accordingly.
- Mixed battlefield formations should support ranged-behind-frontline logic such as pike-and-shot or equivalent sheltering relationships.

## Hero versus formation scale bridging

- Lone heroes, hero groups, and larger formations should not all resolve through the same skirmish math.
- A lone isolated hero should interact with formations differently from a coordinated hero group.
- Specialist roles such as scouts, saboteurs, infiltrators, or ritual operators may participate through side-objectives, sabotage, reconnaissance, or theft instead of pure line combat.

## Siege-mode battle surfaces

- Fixed defenses, entrenched units, emplacements, and fortifications require dedicated assumptions beyond open-field battle logic.
- Structures may take hits like entities and then resolve separate collapse consequences for occupants.
- Doors, gates, apertures, ladders, grapples, and breach mouths define throughput and shelter asymmetry.
- Siege outcomes should weight starvation, thirst, disease, morale, surrender, sorties, bribery, infiltration, and campaign pressure at least as heavily as direct breach damage.
- Attackers and defenders may use distinct morale and surrender logic.
- Internal betrayal, opened gates, bribed custodians, plague carriers, tainted supplies, or illusionary reinforcements remain valid siege-resolution channels.
- Forts may act as warning, rally, and fallback infrastructure rather than perfect denial walls.

## Exception tags and compact representation

Valid compact note-tags include patterns like irregular, chaotic, favored terrain, vulnerability, regeneration, horror-causing, or similar bounded exceptions that materially change behavior without exploding the stat surface.

## Distinctions to preserve

- A formation is not just one oversized person.
- A formation is not a full wargame order-of-battle simulator.
- Siege mode is not ordinary field combat with bigger hit points.
- Command friction is not flavor; it changes whether formations stay coherent.

## Non-goals

- No full wargame simulator for every encounter.
- No actor-by-actor requirement for mass battles.
- No sprawling order-of-battle modeling.
- No historical drill simulator or radio-network simulator.

## Expected use

Use this doc when a scenario needs force tiers above the individual actor, readable command friction, explicit formation posture, hero-to-formation scale bridging, or siege-specific battlefield rules while remaining deterministic and inspectable.
