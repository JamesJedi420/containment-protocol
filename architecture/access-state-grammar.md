# Access state grammar

## Source

Synced from Linear Containment Protocol project resource (2026-05-12). Git is canonical for ongoing edits. Original: [Linear doc](https://linear.app/spectranoir/document/access-state-grammar-e089ba6879d5).

## Scope

Covers entry control, temporary shelter states, typed breach validation, portal-style transit, and broader access-state behavior where passage, refuge, and extraction use one coherent grammar rather than unrelated lock or movement mechanics.

## Included issue boundaries

- SPE-406
- SPE-418
- SPE-1648

## Core rules

- Lock, unlock, hold, anti-entry, temporary shelter, and transit actions should share one access-state grammar.
- Traversal and breach actions validate against barrier type, material class, exit surface, and current region or domain state.
- Movement powers are distinct locomotion contracts, not one generic mobility buff.
- Major altered states may advertise specific reversal channels instead of one universal cleanse path.
- Typed access validation should be legible enough to explain why a breach, transit, or shelter attempt succeeded, failed, or redirected.

## Shelter and pocket-space behavior

- Temporary protected interiors or pocket shelters are distinct from ordinary rooms.
- They should remain maintainable, reversible, and safe on return placement rather than functioning as implicit lethal deletion when upkeep stops.
- Payload, worn gear, restraints left behind, passenger limits, distance-scaled strain, and arrival disorientation may all differ by access mode.
- Temporary off-map containment or refuge should preserve real return-placement rules and not assume clean recovery by default.

## Border and region behavior

- Narrative or metaphysical borders may isolate, condense, expand, relocate, or redirect regions according to authored law rather than ordinary geography alone.
- Border closure should not rely on one wall-like abstraction only. Fatigue fields, sleep collapse, disorientation, reset-to-origin behavior, living containment rings, and active sovereign suppression can all serve as closure modes.
- Escape may depend on temporary sovereign suppression, internal disruption, or a short release window rather than permanent controller death.
- Rare privileged navigators may interpret or cross barriers more reliably without normalizing those routes for everyone else.
- Binding or interdiction tools may selectively remove cross-boundary escape while leaving local action intact.

## Actor-mediated chokepoints

- Some chokepoints are controlled by local gatekeeper actors rather than static locks.
- Passage outcomes may depend on recognition, allegiance, random hostility, local pressure, or underworld influence.
- This actor-run chokepoint surface is a consumer of the broader access grammar, not a separate legitimacy simulator.
- Guardian passage, per-actor authentication, and social permission checks remain narrower consumers layered on top.

## Alternate-state extraction and refuge

- Entering a dangerous structure can be forced by refuge logic, where weather, storm, flood, or regional hazard makes the site safer than remaining outside even if the site itself is dangerous.
- Shelter need and access threat may be the same decision surface.
- Alternate-state extraction can produce return, drift, capture, or delayed reclosure depending on state and controller condition rather than one clean exit path.

## Distinctions to preserve

- Access-state logic is distinct from broad legitimacy or sanction policy.
- Shelter state is distinct from ordinary room occupancy.
- Transit is distinct from free universal teleport.
- Border behavior is distinct from ordinary map edges.
- Extraction outcomes may vary without turning the whole system into a movement sandbox.

## Non-goals

- No universal teleport sandbox.
- No sprawling movement simulator.
- No full prison-region or cosmology simulator.

## Expected use

Use this doc when implementing any mechanic where access, passage, holding, temporary refuge, actor-mediated chokepoints, or controlled transit depends on typed validation, metaphysical closure, temporary shelter, or alternate extraction state rather than pure locomotion.
