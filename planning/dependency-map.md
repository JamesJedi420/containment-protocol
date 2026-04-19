# Containment Protocol — Dependency Map

## Purpose

This document defines the major implementation and planning dependencies for Containment Protocol.

It exists to clarify:

- which systems depend on which other systems
- what should be built before other work
- where false parallelism is likely to waste effort
- which features are blocked by missing ownership, propagation, or surfacing work
- how to sequence issues and milestones without breaking the project’s core loop

This is not a code dependency graph.

It is the project-level dependency map for system, UX, QA, tuning, and planning work.

This document is for:

- planning
- issue sequencing
- milestone dependency review
- implementation prioritization
- scope control

---

## Dependency map goals

The dependency map should:

- make core implementation order explicit
- reduce wasted work from building downstream features too early
- keep the weekly loop at the center of sequencing
- show where integration, surfacing, and persistence are foundational
- help identify the true blocker behind “not ready yet” work
- support honest issue closure and milestone planning

The dependency map should not:

- imply every system must be built serially with no overlap
- encourage speculative branching into unfinished downstream work
- reduce all dependencies to raw technical file order
- confuse documentation order with implementation dependency where they differ
- hide cross-system propagation requirements

---

## 1. Dependency philosophy

Containment Protocol should be built from foundational state and loop structure upward.

Preferred dependency logic:

```text
Canonical ownership
-> weekly loop
-> mission and agency consequence
-> surfaced explanation
-> world reactivity
-> breadth, tuning, and scale
```

This means the most important blockers are usually not “missing content” but one of:

- unclear ownership
- missing loop integration
- missing propagation
- missing surfaced explanation
- missing persistence/determinism trust

## 2. Dependency levels

Useful dependency levels for planning:

Level 0 — Foundations

- State ownership, persistence shape, event shape, and core architecture.

Level 1 — Core loop

- Incident intake, triage, deployment, resolution, and weekly reporting.

Level 2 — Institutional continuity

- Support, specialists, recovery, pressure, and readiness carryover.

Level 3 — Surfaced trust

- Warnings, reports, Agency/Triage clarity, and player-facing legibility.

Level 4 — World reactivity

- Hub, factions, legitimacy, filtered opportunities, and district-facing variation.

Level 5 — Breadth and hardening

- Tuning depth, QA expansion, content scaling, and broader strategic variety.

This is the main sequencing spine.

## 3. Foundation dependencies

These are the foundational documents/systems that most other work depends on.

## 3.1 Game state schema

Enables:

- clear ownership
- persistence shape
- correct downstream state updates
- deterministic reasoning

Blocks if missing:

- mission resolution outputs
- recovery carryover
- pressure propagation
- persistence trust

## 3.2 Entity relationship model

Enables:

- correct relationship reasoning
- issue and system scoping
- UI linkage clarity
- reduced duplicate state

Blocks if missing:

- ownership clarity across systems
- proper incident/mission distinction
- clean report and event references

## 3.3 Event schema

Enables:

- report generation
- debugging
- deterministic test inspection
- historical explanation

Blocks if missing:

- trustworthy report note generation
- event-driven QA validation
- causal surfacing consistency

## 3.4 Persistence model

Enables:

- campaign continuity
- save/load trust
- migration planning
- deterministic reload validation

Blocks if missing:

- real multi-week validation
- safe long-horizon feature work
- honest milestone closure on persistent systems

Foundation rule

Later systems can begin design before all foundation work is perfect, but they should not be considered truly implemented until they respect these foundations.

## 4. Core loop dependencies

These systems form the playable center of the game.

## 4.1 Incident generation

Depends on:

- game state schema
- entity relationship model
- pressure state concepts

Enables:

- mission triage
- escalating weekly intake
- future hub/world reactivity

## 4.2 Mission triage

Depends on:

- incident generation
- basic agency/team state
- urgency/severity/deferral state
- initial surfaced view rules

Enables:

- deployment decisions
- player-facing prioritization
- weekly planning loop

## 4.3 Deployment flow

Depends on:

- mission triage
- team management basics
- support and readiness visibility
- bounded mission requirement data

Enables:

- real commitment step
- mission resolution input trust
- pre-resolution warning surfacing

## 4.4 Mission resolution

Depends on:

- deployment input state
- team state
- support state
- pressure interaction rules
- outcome and fallout shape

Enables:

- reports
- recovery burden
- pressure carryover
- legitimacy/faction reaction
- event generation

## 4.5 Operations report

Depends on:

- mission resolution
- event schema
- report note logic
- weekly state updates

Enables:

- player learning
- next-week planning trust
- QA consequence validation

Core loop rule

Until these systems are real together, broad downstream expansion is premature.

## 5. Institutional continuity dependencies

These systems make the agency matter across weeks.

## 5.1 Team management

Depends on:

- game state schema
- deployment flow
- mission resolution outputs
- recovery ownership

Enables:

- readiness continuity
- role coverage consequence
- attrition and replacement pressure

## 5.2 Support operations

Depends on:

- agency state ownership
- mission resolution
- deployment warning inputs
- report surfacing

Enables:

- clean vs degraded follow-through
- institutional throughput constraints
- support bottleneck notes

## 5.3 Specialist throughput

Depends on:

- support operations model
- recovery/procurement interaction
- bounded specialist lane design

Enables:

- specific bottlenecks
- repair/recovery queue logic
- specialist-facing carryover

## 5.4 Pressure mechanics

Depends on:

- incident generation
- mission outcomes
- support/recovery state
- legitimacy/faction consequence hooks

Enables:

- escalation
- overload
- carryover strategic friction
- world reactivity pressure sources

## 5.5 Recovery and attrition

Depends on:

- mission resolution fallout
- team management
- support and specialist throughput
- persistence

Enables:

- next-week readiness loss
- backlog
- replacement pressure
- institutional memory

Institutional rule

These systems should not be treated as optional polish. They are what make the game institution-first.

## 6. Surfaced trust dependencies

These systems make the game understandable and trustworthy.

## 6.1 Agency view

Depends on:

- team management
- support operations
- recovery state
- pressure state
- economy and institutional summaries

Enables:

- weekly health checks
- visible bottleneck diagnosis
- deployment planning trust

## 6.2 Mission Triage view

Depends on:

- incident generation
- basic hub output conversion
- urgency/escalation surfacing
- current agency constraint data

Enables:

- clean prioritization
- visible deferral cost
- weekly planning clarity

## 6.3 Deployment view

Depends on:

- mission triage
- team readiness data
- support/specialist warning logic
- mission requirement data

Enables:

- informed commitment
- visible bottleneck acceptance
- stronger mission resolution trust

## 6.4 Operations Report view

Depends on:

- event schema
- mission resolution
- report note generation
- pressure/recovery/faction consequence propagation

Enables:

- player learning
- causal explanation
- issue closure evidence quality

## 6.5 Procurement and Support view

Depends on:

- economy state
- support operations
- specialist throughput
- recovery backlog
- readiness-affecting item state

Enables:

- material stabilization choices
- visible repair/replacement bottlenecks
- institutional throughput action paths

Surfacing rule

A system is not meaningfully complete if the player cannot see and reason about it in the relevant surface.

## 7. World reactivity dependencies

These systems expand the campaign outward once the center is trustworthy.

## 7.1 Hub simulation

Depends on:

- incident generation
- faction state
- legitimacy state
- recent mission outcomes
- opportunity/risk surfacing rules

Enables:

- rumors
- leads
- contracts
- socially filtered opportunities
- pacing variation

## 7.2 Factions and legitimacy

Depends on:

- mission outcome consequence propagation
- pressure systems
- hub simulation hooks
- report surfacing support

Enables:

- opportunity filtering
- access variation
- faction-linked contracts
- political/social consequence

## 7.3 District or place-bound variation

Depends on:

- hub simulation foundation
- incident generation hooks
- faction/legitimacy interaction rules

Enables:

- local signal variation
- stronger place identity
- opportunity pattern differentiation

World reactivity rule

Do not deepen these systems heavily before the weekly loop and institutional continuity are already trustworthy.

## 8. Tuning dependencies

Tuning work depends on systems being real enough to tune.

## 8.1 Pressure curves

Depends on:

- pressure mechanics implemented
- carryover and relief behavior visible
- reports and views surfacing pressure meaningfully

## 8.2 Resource economy

Depends on:

- procurement/economy interactions implemented
- support/recovery burden visible
- upgrade and replacement decisions at least lightly real

## 8.3 Resolution thresholds

Depends on:

- mission resolution implemented
- deployment warnings meaningful
- bottleneck logic visible in reports or outcomes

## 8.4 Escalation and fallout

Depends on:

- incident escalation
- mission outcome consequence
- pressure and report integration

## 8.5 Support and specialist capacity

Depends on:

- support operations
- specialist throughput
- recovery backlog
- report and Agency surfacing

Tuning rule

Do not spend heavily tuning a system still missing basic propagation or explanation.

## 9. QA dependencies

QA plans rely on implementation maturity.

## 9.1 System test plan

Depends on:

- core systems existing in bounded usable form
- fixture-worthy canonical state
- basic report/event visibility

## 9.2 Determinism test plan

Depends on:

- persistence
- event schema
- repeatable weekly transitions
- stable threshold logic

## 9.3 Integration test plan

Depends on:

- connected systems actually propagating state
- multiple surfaces reflecting shared truth
- event/report chains existing

## 9.4 Edge case checklist

Depends on:

- thresholded systems
- persistence
- strain and overload states
- enough implementation breadth to produce awkward states

## 9.5 Feature done criteria

Depends on:

- issue structure
- testability
- surfaced evidence
- milestone standards

QA rule

Testing documents become genuinely useful only when implementation produces inspectable state and propagation.

## 10. Planning dependencies

These planning documents also have dependency order.

## 10.1 MVP scope

Depends on:

- roadmap
- milestone understanding
- core system dependency clarity

## 10.2 Roadmap

Depends on:

- knowing the actual core loop and its blockers
- foundation and system dependency clarity

## 10.3 Milestones

Depends on:

- roadmap sequencing
- feature done criteria
- issue grouping around real proof questions

## 10.4 Dependency map

Depends on:

- all major system boundaries being understood

This document supports the others by making sequencing explicit.

## 11. Recommended implementation dependency chain

A practical implementation chain looks like this:

State / relationships / persistence / events
-> incident generation
-> mission triage
-> team basics
-> deployment
-> mission resolution
-> reports
-> support / specialists / recovery / pressure
-> Agency / Procurement / better warning surfaces
-> hub / factions / legitimacy
-> deeper tuning / broader QA / strategic breadth

This should remain the primary sequencing spine unless a strong dependency-based reason changes it.

## 12. False parallelism risks

These are places where work may look parallelizable but is actually blocked.

Risk 1: building rich Hub before consequence propagation exists

The Hub will look alive but not be causally trustworthy.

Risk 2: building many views before state ownership is settled

Views will become shadow logic layers.

Risk 3: tuning before real thresholds or surfacing exist

Balance work will optimize placeholder behavior.

Risk 4: content scaling before systems are integrated

More content will only create more misleading test noise.

Risk 5: broad planning before MVP proof path is stable

Future work will be planned on weak assumptions.

## 13. Dependency review questions

When deciding whether a new issue is unblocked, ask:

- What canonical state does this depend on?
- What upstream system creates its input?
- What downstream system should react to its output?
- What player-facing surface must explain it?
- What QA evidence would prove it works?
- What persistence or determinism requirement does it inherit?

If those answers are unclear, the issue is probably either underspecified or not truly ready.

## 14. Acceptance criteria

This dependency map is effective when:

- sequencing decisions are easier to justify
- fewer downstream features are started prematurely
- milestone planning better reflects real blockers
- issue dependencies are easier to spot
- foundation work is recognized as enabling, not optional
- the project spends less time on broad unfinished fronts

## 15. Summary

The Containment Protocol dependency map should make clear that the game must be built from trustworthy state and loop structure outward.

The true order is:

- foundations
- core loop
- institutional continuity
- surfaced trust
- world reactivity
- tuning, breadth, and hardening

The core planning question is:

what is this work actually blocked by, and does building it now strengthen the center of the game or bypass it?
