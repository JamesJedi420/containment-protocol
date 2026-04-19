# Containment Protocol — Roadmap

## Purpose

This document defines the high-level roadmap for Containment Protocol.

The roadmap is not a marketing promise and not a wish list. It is the project-facing sequencing guide for turning the game vision into a bounded, playable, verifiable product.

It exists to answer:

- what should be built first
- what depends on what
- how the game should mature from core loop proof to broader strategic depth
- how to avoid scope drift while still moving toward the intended finished game
- what kinds of work belong in each development phase

This document is for:

- planning
- milestone sequencing
- issue prioritization
- implementation alignment
- scope control

---

## Roadmap goals

The roadmap should:

- sequence work by dependency, not excitement
- prioritize the core weekly loop first
- keep each phase bounded and testable
- delay breadth until the core loop is trustworthy
- make integration and explanation part of delivery, not cleanup
- support a playable MVP and a credible path beyond it

The roadmap should not:

- imply all systems should grow in parallel
- encourage broad unfinished feature fronts
- prioritize content volume before systems stability
- treat UI surfaces as done before the underlying game loop is real
- mistake documentation completeness for implementation readiness

---

## 1. Roadmap philosophy

Containment Protocol should be built from the center outward.

That means:

- first prove the weekly campaign loop
- then make the institution matter
- then make the world react more richly
- then increase strategic variety and long-horizon depth

Preferred order:

```text
Core loop
-> institutional constraint
-> consequence continuity
-> surfaced explanation
-> bounded world reactivity
-> broader strategic texture
```

If this order is reversed, the game risks becoming wide but hollow.

## 2. Roadmap phases overview

Recommended phases:

- Core simulation foundation
- Core loop playability
- Institutional pressure and continuity
- Surfaced explanation and usability
- Bounded world reactivity
- Strategic deepening and campaign breadth
- Hardening, balancing, and content scaling

These phases are not perfectly rigid, but their dependency order should remain stable.

## 3. Phase 1 — Core simulation foundation

Goal

Establish the canonical campaign state, ownership boundaries, persistence shape, and basic weekly processing skeleton.

Main work

- game state schema
- entity relationship model
- event schema
- persistence model
- initial weekly transition structure
- initial deterministic state processing rules

Why first

Without this phase:

- downstream systems lack stable ownership
- persistence becomes brittle
- report and consequence systems drift
- determinism becomes harder to recover later

Exit condition

The project has a trustworthy canonical state structure and a usable simulation backbone for the weekly loop.

## 4. Phase 2 — Core loop playability

Goal

Make the player able to complete the basic weekly loop end to end.

Main work

- incident generation
- mission triage
- deployment flow
- mission resolution
- basic team management
- weekly report generation
- minimal playable surfaces for Agency, Triage, Deployment, and Reports

Why second

This is the smallest real proof of the game.

Until this phase works:

- Containment Protocol is not yet playable as itself
- later systems cannot be judged in context
- tuning lacks meaningful signal

Exit condition

A player can play through several weeks and feel real triage, deployment, result, and next-week consequence.

## 5. Phase 3 — Institutional pressure and continuity

Goal

Make the institution itself matter across weeks.

Main work

- support operations
- specialist throughput and bottlenecks
- recovery and attrition
- replacement pressure
- pressure mechanics
- carryover degradation and backlog systems
- readiness/recovery propagation across weeks

Why here

The core loop exists by now, so the next priority is making the institution a real machine with limits and memory.

This phase is where Containment Protocol becomes more than “missions in sequence.”

Exit condition

The agency has meaningful bounded capacity, overload states, recovery burden, and persistent institutional tradeoffs.

## 6. Phase 4 — Surfaced explanation and usability

Goal

Make the game legible enough that players can learn from it and QA can trust it.

Main work

- report note quality
- warning surfacing
- bottleneck prioritization
- Agency view refinement
- Operations Report refinement
- Procurement and Support view
- stronger deployment warnings
- cross-surface consistency
- determinism and integration test plans

Why here

A systems-driven game fails if the player cannot understand why outcomes happened.

This phase should happen before broadening world complexity.

Exit condition

The important consequences of play are visible, explainable, and connected to action.

## 7. Phase 5 — Bounded world reactivity

Goal

Make the campaign world feel socially and politically responsive without exploding scope.

Main work

- hub simulation
- rumors, leads, and contracts
- basic factions and legitimacy
- district or place-bound opportunity structure
- filtered information behavior
- faction presence shaping output
- legitimacy-sensitive access or opportunity changes

Why here

Only after the core loop and institutional consequences are stable does the game benefit from richer world-facing variation.

Exit condition

The world is now visibly reacting through the Hub, faction posture, and filtered opportunities in a way that strengthens the core loop.

## 8. Phase 6 — Strategic deepening and campaign breadth

Goal

Increase replayability, strategic differentiation, and longer-horizon campaign depth.

Main work

- more incident classes and follow-on chains
- richer mission subdomain support
- broader role/system interactions
- light facilities and progression depth
- stronger economic tradeoffs
- more differentiated district or regional behavior
- deeper but still bounded long-horizon pressure patterns

Why here

At this point the game should already work. This phase adds breadth only after the center is trustworthy.

Exit condition

Multiple campaign runs can produce meaningfully different strategic shapes without losing clarity.

## 9. Phase 7 — Hardening, balancing, and content scaling

Goal

Make the game robust, fair, legible, and broad enough to sustain repeated play.

Main work

- balance tuning
- pressure curve tuning
- threshold tuning
- escalation/fallout tuning
- content volume increase
- regression hardening
- persistence and migration safety passes
- broader QA fixture coverage
- UX clarity cleanup
- pacing validation

Why last

Hardening only works when the core structure is already real.

Content scaling also matters more once the underlying machine is trustworthy.

Exit condition

The game is stable enough to support serious iteration, external testing, or release-oriented planning.

## 10. Roadmap dependencies

Key dependency truths:

- Canonical ownership before breadth

  Do not add large system breadth before state ownership is trustworthy.

- Core loop before broad world texture

  Do not deepen hub/faction/world systems before the weekly loop works.

- Institutional consequences before large content volume

  Do not scale incidents, contracts, and content templates before support/recovery/pressure actually matter.

- Surfacing before advanced tuning

  Do not spend heavily on balance before the player can read causal outputs.

- Persistence before long-run validation

  Do not treat multi-week campaign quality as validated until save/load continuity is real.

## 11. Roadmap priorities within active work

When choosing what to do next, prefer work that:

- strengthens the weekly loop directly
- removes fake or placeholder logic from core systems
- improves canonical ownership and deterministic trust
- improves surfaced understanding of important consequence
- unlocks multiple downstream features cleanly

Avoid prioritizing work that is mostly:

- decorative breadth
- speculative future complexity
- interface expansion without stronger game logic
- content volume before supporting systems are ready

## 12. Things to explicitly defer until later

These should generally remain out of early roadmap phases unless re-justified:

- free-roam exploration
- tactical combat depth
- large dialogue networks
- broad region-map complexity
- deep market simulation
- large support staff character layers
- highly bespoke one-off mission subsystems with no reusable base

Deferral is not rejection; it is scope discipline.

## 13. Roadmap risks to watch

Risk 1: Wide-front development

Too many unfinished systems at once reduces confidence and slows integration.

Risk 2: View-first implementation

Building more surfaces than the simulation can truthfully support.

Risk 3: Fake progression

Adding upgrades or more content before the core loop is trustworthy.

Risk 4: Tuning too early

Balancing placeholder systems wastes time and creates false confidence.

Risk 5: Parent issue closure drift

Treating partial slices as full completion of larger roadmap-critical work.

These should be actively resisted.

## 14. Roadmap review questions

During planning review, ask:

- does this work strengthen the weekly loop or bypass it?
- does this depend on unresolved ownership or persistence questions?
- is this introducing breadth before trust?
- does this create new real gameplay consequence, or only more surfaces?
- if this slipped, would the game still move toward MVP proof?
- if this shipped tomorrow, would it make the game more itself?

These questions help keep the roadmap systems-oriented.

## 15. Suggested near-term roadmap focus

Based on the current dependency structure, near-term focus should usually remain:

- finish core UX specs
- complete tuning references
- complete QA references
- use those to harden implementation sequencing
- drive toward MVP loop proof
- resist broadening planning into too many simultaneous future branches

This keeps the roadmap grounded in the real dependency order already established.

## 16. Acceptance criteria

The roadmap is effective when:

- active work is easier to prioritize
- milestone scoping becomes more coherent
- dependency order is clearer
- scope drift is easier to reject
- the team can explain why something is “not yet” without confusion
- the project moves toward a playable core rather than broader unfinished surfaces

## 17. Summary

The Containment Protocol roadmap should move from core loop proof to institutional consequence, then to world reactivity, then to broader strategic depth.

It should prioritize:

- the weekly loop
- deterministic consequence
- institutional bottlenecks
- surfaced explanation
- bounded world texture
- only then broader content and campaign breadth

The core planning question is:

does this next chunk of work make the game’s central machine more real, or just make the project look larger?
