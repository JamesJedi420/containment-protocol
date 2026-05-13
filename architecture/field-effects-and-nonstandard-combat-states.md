# Field effects and nonstandard combat states

## Source

Synced from Linear Containment Protocol project resource (2026-05-12). Git is canonical for ongoing edits.

Original resources merged here:

- [Field effects and nonstandard combat states](https://linear.app/spectranoir/document/field-effects-and-nonstandard-combat-states-1f7596e4c874) (primary; superset).
- [Summoned zone and battlefield control effects](https://linear.app/spectranoir/document/summoned-zone-and-battlefield-control-effects-ea80330fce61) — same SPE-391–393 boundary; autonomous zones, tier immunity, and delayed projectile bundles are **one family** inside this grammar (not a separate combat simulator).

## Scope

Covers autonomous hazard zones, tier-bounded immunity fields, preloaded projectile bundles, fire-source state substitution, persistent area-shape hazards, and other bounded effect-state systems that alter combat, movement, and hazard behavior without requiring full spell-by-spell simulation.

## Included issue boundaries

- SPE-391
- SPE-392
- SPE-393
- SPE-394
- SPE-380
- SPE-408

## Autonomous hazard zones

- Some conjurations create autonomous hazardous areas rather than one-time directed strikes.
- These zones may grasp, strike, or otherwise pressure everything inside their footprint over repeated beats.
- They are distinct from both one-shot projectiles and passive obstacle objects.
- Movement outcomes, positioning choices, and linger-time inside the zone should matter.

## Tier-bounded immunity fields

- Protective fields may block effects by bounded power tier rather than by flat damage resistance or effect-family tag alone.
- These fields may move with or surround a protected target.
- A blocked effect, a bypassing effect, and a reflected or merely resisted effect are distinct outcomes.
- Ontology matters: transformed, undead, or otherwise nonstandard bodies may ignore or remap many biological or restorative interactions even when ordinary living bodies would not.
- Restoration stress can remain a special contradiction surface where forced biological normalization threatens a transformed frame even if ordinary bodily hazards do not.

## Preloaded projectile bundles

- One cast or activation may preload several later-usable projectiles into a bounded stored bundle.
- Bundles can be discharged across later rounds rather than resolving all offensive output immediately.
- A prepared bundle may split shots across several targets under explicit rules.
- This is not a general ammo simulator. It is a compact delayed-output state.

## Fire-source conversion and substitution

- Some effects consume an existing flame source and convert it into another temporary environmental state such as smoke, concealment, flash, or another localized hazard.
- This is distinct from ordinary fire suppression or simple direct damage.
- The consumed source should materially matter to the resulting output.

## Persistent cloud and field penalties

- Cloud or bubble states may combine vision denial, movement distortion, directional uncertainty, and precision-casting suppression in one persistent local field state.
- These fields may roam without trap-trigger dependence and can affect actor families differently.
- Persistent field penalties should be treated as multi-subsystem local states, not visual dressing.

## Persistent area-shape packets

- Area effects may use distinct shape families such as clouds, walls, spheres, shells, paths, cubes, or room-conforming volumes.
- Shape choice is operational, not cosmetic. Walls, clouds, spheres, and shells can carry different collision, line-of-sight, pressure, and barrier semantics.
- Dwell-time, contact-sensitive, pulse-timed, and selective-barrier behaviors should all be authorable inside the same reusable family.
- Persistent hazard surfaces may affect actors, exposed equipment, documents, flammables, structures, and route safety when the effect family supports it.
- Opposing persistent effects may create unstable third states instead of simply canceling cleanly.
- Hidden fixed-boundary zones and room-scale charged or conductive surfaces should remain supportable without requiring visible physical sources.

## Distinctions to preserve

- Autonomous hazard zones are not AI sandboxes.
- Tier immunity is not ordinary resistance.
- Stored projectile bundles are not generic ammunition handling.
- Fire conversion is not just extinguish-versus-burn logic.
- Cloud-state fields are not vision-only concealment.
- Area-shape packets are not generic one-shot AoE templates.

## Non-goals

- No universal summon sandbox.
- No universal anti-magic bubble model.
- No universal ammo simulator.
- No full combustion simulator.
- No full weather simulator.
- No full volumetric physics simulator.

## Expected use

Use this doc when authoring bounded combat effects, protective fields, delayed offensive payloads, environment-substitution mechanics, or persistent shaped hazard volumes that need to stay deterministic, inspectable, and reusable.
