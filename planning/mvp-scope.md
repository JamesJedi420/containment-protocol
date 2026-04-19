# Containment Protocol — MVP Scope

## Purpose

This document defines the MVP scope for Containment Protocol.

The MVP should prove the game’s core identity as a deterministic, systems-driven institutional management sim. It should establish the weekly loop, the main operational decisions, and the core consequence chains without requiring full finished-game breadth.

This document exists to answer:

- what must exist for the game to be meaningfully playable
- what systems are required to prove the core loop
- what can remain lighter or deferred
- what should be explicitly excluded from MVP
- what “enough to validate the game” actually means

This document is for:

- planning
- issue prioritization
- milestone scoping
- implementation focus
- scope control

---

## MVP goals

The MVP should:

- prove the weekly institutional campaign loop
- make triage, deployment, and consequence meaningful
- demonstrate deterministic mission resolution with persistent cost
- make agency-side bottlenecks matter
- surface clear reports and next-week planning consequences
- support enough variation to validate strategic replayability
- remain bounded enough to actually finish

The MVP should not:

- attempt the full finished-game breadth
- require every speculative subsystem
- become content-heavy before systems are trustworthy
- overbuild hub, faction, or regional complexity too early
- mistake documentation completeness for playable completeness

---

## 1. Core MVP question

The MVP is successful if a player can complete multiple weeks and come away feeling:

- I am running an institution, not a hero
- my decisions have persistent consequences
- triage and deployment are real tradeoffs
- bottlenecks and pressure shape what I can sustain
- imperfect outcomes change next week in understandable ways

If the build cannot deliver that, it is not yet a valid MVP.

---

## 2. Required MVP player loop

The MVP must support this loop end to end:

```text
Week starts
-> incoming work appears
-> player reviews institutional condition
-> player triages and routes work
-> player assigns and deploys teams
-> missions resolve deterministically
-> fallout, pressure, and recovery are applied
-> reports explain what happened
-> next week begins under changed conditions
```

This loop is the MVP’s true center. Everything else is secondary.

## 3. MVP-in systems

These systems should be considered in-scope for MVP.

## 3.1 Canonical campaign state

Required because:

the game must preserve persistent agency/world condition

weekly transitions require durable, inspectable state

determinism depends on clean ownership

Minimum expectation:

- agency
- teams
- operatives
- incidents
- missions
- support state
- recovery state
- reports
- pressure-relevant state
- persistence-ready structure

## 3.2 Weekly progression

Required because:

the game is fundamentally a weekly campaign sim

Minimum expectation:

- advance week flow
- state update sequencing
- repeatable week transitions
- visible continuity between weeks

## 3.3 Incident generation

Required because:

the player needs incoming problems to triage

pressure must emerge from campaign state

Minimum expectation:

- bounded incident generation from state
- escalation-sensitive intake
- variation in urgency/severity
- at least one follow-on consequence pattern

## 3.4 Mission triage

Required because:

prioritization is one of the main player decisions

Minimum expectation:

- compare actionable work
- route now / defer / ignore
- visible urgency and risk
- meaningful deferral consequence

## 3.5 Deployment flow

Required because:

the player needs a distinct commit step before resolution

Minimum expectation:

- select team
- validate readiness and key requirements
- surface bottlenecks
- commit operation

## 3.6 Mission resolution

Required because:

the game must convert planning into outcomes

this is one of the main proofs of the design

Minimum expectation:

- deterministic result bands
- partial success support
- follow-through quality
- fallout application
- visible bottleneck-sensitive outcomes

## 3.7 Team management

Required because:

team viability is central to institutional play

Minimum expectation:

- operatives grouped into teams
- readiness
- role coverage
- injuries/recovery persistence
- degraded versus ready team states

## 3.8 Support operations

Required because:

the game should prove that the institution matters, not just field teams

Minimum expectation:

- support availability
- support shortage
- visible follow-through effect
- support-related report explanation

## 3.9 Recovery and attrition

Required because:

persistent cost must carry across weeks

Minimum expectation:

- operative recovery
- equipment or asset recovery burden
- carryover readiness loss
- replacement pressure at a basic level

## 3.10 Pressure mechanics

Required because:

the campaign must not become static optimization

Minimum expectation:

- unresolved pressure worsens future state
- support/recovery overload matters
- some pressure states visibly chain into future weeks
- pressure is surfaced in reports or main views

## 3.11 Reports

Required because:

a deterministic management sim must explain causality clearly

Minimum expectation:

- weekly report
- major outcomes
- causal notes
- visible carryover/bottleneck explanation

## 3.12 Persistence

Required because:

weekly continuity and testing depend on it

campaign identity depends on durable state

Minimum expectation:

- save/load canonical campaign state
- preserve next-week continuity
- support deterministic reload behavior

## 4. MVP-light systems

These systems should exist in MVP only in a bounded, deliberately limited form.

## 4.1 Hub simulation

Why light:

useful for pacing and signal variation

not required to prove the full game at maximum breadth yet

MVP form:

- small rumor/lead/contract surface
- simple socially filtered output
- limited number of meaningful items
- enough to prove non-incident surfacing

Not required in MVP:

- broad district complexity
- rich service-node network
- large-scale multi-layer social simulation

## 4.2 Factions and legitimacy

Why light:

important for long-horizon texture

not required at finished-game richness to validate the loop

MVP form:

- small number of factions or stance markers
- basic relationship shifts
- limited effect on opportunity quality or filtering
- simple legitimacy sensitivity

Not required in MVP:

- dense faction network
- heavy access matrix
- complex multi-region political behavior

## 4.3 Procurement and economy

Why light:

some material scarcity is needed

full market depth is not

MVP form:

- bounded funding resource
- simple procurement and repair/replacement pressure
- a few meaningful blocked/unblocked decisions

Not required in MVP:

- rich market simulation
- large inventory depth
- broad supplier ecosystem

## 4.4 Facilities and long-horizon upgrades

Why light:

progression matters, but core loop proof matters more

MVP form:

- a few bounded upgrades or capacity modifiers
- enough to prove growth versus stabilization tradeoff

Not required in MVP:

- deep build tree
- broad facility specialization lattice

## 5. MVP-out systems

These should be considered explicitly out of MVP unless later re-approved.

## 5.1 Free-roam hub or city play

Out because:

it competes with the bounded campaign loop

it adds navigation burden without proving the core design

## 5.2 Tactical combat layer

Out because:

the game is not trying to prove a detached combat game first

tactical depth would distort scope and feedback loops

## 5.3 Large narrative conversation systems

Out because:

the game’s identity is systems-first

conversation depth does not prove institutional play on its own

## 5.4 Overly granular support staff simulation

Out because:

support should remain bounded and institutional in MVP

## 5.5 Large regional/world map simulation breadth

Out because:

MVP needs systemic clarity before geographic scale

## 5.6 Massive role/specialist matrix

Out because:

bounded legibility matters more than content breadth

## 6. MVP content expectations

The MVP does not need huge content volume, but it does need enough content shape to validate the systems.

Minimum useful content breadth:

- multiple incident patterns
- several mission response types
- at least some rumor/lead/contract variation
- a few distinct bottleneck patterns
- enough reports to show different causal notes
- enough team/role variety to make composition matter

The MVP should prove range, not quantity.

## 7. MVP UX surfaces

These views should exist in MVP.

Required

- Agency view
- Mission Triage view
- Deployment flow
- Operations Report view

Strongly recommended

- bounded Hub view
- Procurement and Support view

Not required at full breadth

- deep faction reference surfaces
- broad world-region navigation
- large historical dashboards

The MVP should prioritize clear decision surfaces over broad interface coverage.

## 8. MVP proof points

The MVP should prove the following claims.

Claim 1

Triage matters because not everything can be handled cleanly.

Claim 2

Deployment quality matters because team state, support, and bottlenecks affect outcomes.

Claim 3

Partial success is a meaningful result, not a failure placeholder.

Claim 4

The institution remembers what happened through pressure, recovery, and carryover.

Claim 5

Reports and surfaces explain the consequences clearly enough for the player to learn.

Claim 6

The next week feels changed because of the prior week.

If the MVP proves those, it is successful even without full finished-game breadth.

## 9. MVP quality bar

An MVP feature should count only if it is:

- real
- integrated
- surfaced
- deterministic enough for current scope
- capable of producing meaningful campaign consequence

This means MVP should not rely on:

- fake placeholder logic
- disconnected mock UI
- non-persistent state masquerading as progress
- manual interpretation to explain missing propagation

A smaller real loop is better than a broad fake one.

## 10. MVP sequencing guidance

Recommended MVP build order:

- canonical weekly loop and persistence shape
- incident generation and mission triage
- team management and deployment validation
- mission resolution and fallout
- support operations and recovery carryover
- reports and causal surfacing
- bounded hub and legitimacy/faction texture
- light procurement and capacity progression

This keeps implementation aligned to the dependency chain of the real game.

## 11. MVP validation questions

The MVP is ready when testers can answer:

- what is the current problem set?
- what can the agency actually sustain this week?
- why did this mission succeed, partial, or fail?
- what bottleneck is hurting the institution?
- what changed next week because of this week?
- what should be handled first, and what can wait?

If those answers are weak or unclear, the MVP is not ready.

## 12. Common MVP scope mistakes to avoid

Mistake 1: breadth before loop proof

Adding more features before the weekly consequence loop is trustworthy.

Mistake 2: UX breadth without systems depth

Building more screens than the campaign logic can support.

Mistake 3: content volume as substitute for consequence quality

Writing more incidents or rumors before propagation and explanation work.

Mistake 4: overbuilding hub/faction complexity

Adding social/world breadth before operational core is solid.

Mistake 5: closing big issues on partial proof

Calling the MVP ready when the parent loop is still only partially integrated.

## 13. Acceptance criteria

The MVP scope is correct when:

- the required systems are clearly identified
- the out-of-scope systems are explicitly excluded
- the team can use this doc to say no to scope drift
- milestone planning can sequence work against the real loop
- “MVP complete” would mean “the core game is proven,” not “many features exist”

## 14. Summary

The Containment Protocol MVP should prove the game’s central promise: a deterministic weekly institutional management loop where triage, deployment quality, bottlenecks, and consequence all matter across time.

It should include:

- the real weekly loop
- deterministic mission resolution
- support/recovery/pressure carryover
- clear report explanation
- bounded but meaningful opportunity variation

It should exclude:

- broad simulation sprawl
- tactical combat diversion
- free-roam or dialogue-heavy expansion
- systems that do not strengthen the core loop

The core question is:

if we shipped only the MVP, would players already understand the real game Containment Protocol is trying to become?
