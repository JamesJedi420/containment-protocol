# Containment Protocol — Roles and Systems Reference

## Purpose

This document defines the core role and system reference for Containment Protocol.

It exists to give implementation, design, UI, writing, and QA work a shared reference for:

- major operative roles
- core institutional systems
- what each role or system is responsible for
- how they connect to the weekly campaign loop
- how they should be described in bounded, implementation-ready terms

This is not a full content encyclopedia.

It is a support reference that helps the project stay consistent as systems grow.

This document is for:

- design reference
- implementation alignment
- UI and report wording support
- QA terminology alignment
- future system mapping

---

## Reference goals

This reference should:

- define the main project roles cleanly
- map those roles to actual gameplay/system use
- define the major systems in consistent terms
- reduce terminology drift
- support issue, spec, and UI consistency
- stay bounded and useful rather than encyclopedic

This reference should not:

- become a lore compendium
- replace implementation specs
- introduce unsupported mechanics
- overdefine roles the game does not actually use
- encourage specialization sprawl

---

## 1. Reference philosophy

Containment Protocol is an institution-first management sim.

That means roles and systems should be defined by:

- operational function
- campaign consequence
- bounded gameplay use
- institutional legibility

They should not be defined by:

- dramatic archetype language
- freeform character-fiction potential
- bespoke one-off exceptions
- vague “does a bit of everything” descriptions

This reference should help answer:

- what is this role for?
- what system does it matter to?
- what does this system actually do?
- where does this belong in the weekly loop?

---

## 2. Core operative role principles

Operative roles should:

- matter to deployment and mission quality
- be readable at a glance
- imply real coverage differences
- support bounded team composition
- avoid specialization matrix explosion

Good role design should make the player care about:

- who covers critical capability
- what role is missing
- what deployment becomes weaker because of that gap

Roles should not exist just to make the roster look deep.

---

## 3. Example core operative roles

These are reference roles intended as a stable starting set. Final implementation can rename or slightly refine them, but should preserve bounded system meaning.

## 3.1 Field lead

### Field lead — Function

Provides operational leadership and stabilizes team execution under pressure.

### Field lead — Typical gameplay relevance

- team reliability
- deployment quality
- coordination-sensitive missions
- bounded reduction of execution breakdown

### Field lead — Notes

This is not a narrative commander fantasy role.
It is a bounded operational role inside a team.

---

## 3.2 Recon specialist

### Recon specialist — Function

Improves information quality, site understanding, and exposure management.

### Recon specialist — Typical gameplay relevance

- recon-sensitive missions
- hidden-state or uncertainty-heavy environments
- reduced avoidable fallout
- better pre-resolution clarity

### Recon specialist — Notes

This role helps the player convert partial information into cleaner action.

---

## 3.3 Containment specialist

### Containment specialist — Function

Improves direct handling of unstable, hazardous, or escalation-prone targets.

### Containment specialist — Typical gameplay relevance

- anomaly containment
- stabilization under pressure
- reduced spillover or secondary worsening
- improved control during high-risk intervention

### Containment specialist — Notes

This should feel like a role that matters because the game contains unstable systems, not because it is a magical class label.

---

## 3.4 Recovery / medical specialist

### Recovery / medical specialist — Function

Supports casualty handling, stabilization, and survivability during or after operations.

### Recovery / medical specialist — Typical gameplay relevance

- survivor recovery
- injury mitigation
- post-contact stabilization
- reduced personnel fallout

### Recovery / medical specialist — Notes

This role can be mission-facing, while broader recovery throughput may still depend on agency-side systems.

---

## 3.5 Technical specialist

### Technical specialist — Function

Handles infrastructure, devices, systems access, and mechanically sensitive operational tasks.

### Technical specialist — Typical gameplay relevance

- infrastructure incidents
- asset recovery
- site access
- equipment-dependent objectives
- reduced technical failure risk

### Technical specialist — Notes

This role should support system-specific mission layers without creating broad engineering sprawl.

---

## 3.6 Security / intervention specialist

### Security / intervention specialist — Function

Provides direct field capability in dangerous or force-sensitive intervention contexts.

### Security / intervention specialist — Typical gameplay relevance

- hazardous entry
- force-backed response
- contested or unstable site control
- reduced collapse under high direct threat

### Security / intervention specialist — Notes

This should remain bounded and operational. Containment Protocol is not a detached tactical combat game.

---

## 4. Role coverage guidance

Role coverage should answer:

- does the team have the capability this mission pressures?
- what weak link is likely to dominate outcome?
- which missing role is making this deployment reckless?

Good role coverage design:

- makes missing critical roles visible
- allows some missions to tolerate imperfect coverage
- makes well-composed teams cleaner and more reliable

Bad role coverage design:

- every mission requires every role
- role differences are too soft to matter
- role set is so large the player cannot reason about it

---

## 5. Support specialist reference

Support specialists are agency-side bounded capability roles, not deployable squad members.

Examples may include:

- maintenance specialist
- engineer
- handler
- doctrine expert

### Support specialist — Purpose

These roles change what the institution can sustain or process.

### Support specialist — Typical gameplay relevance

- recovery throughput
- repair throughput
- bounded capability unlocks
- reduced backlog in narrow lanes

### Support specialist — Notes

Support specialists should stay scarce and specific.
They should create visible bottlenecks without becoming a support-character sim.

---

## 6. Major system reference

The following systems make up the main campaign machine.

## 6.1 Incident generation

### Incident generation — Function

Creates and updates the incoming problem space from campaign state.

### Incident generation — Produces

- incidents
- follow-on work
- contract opportunities
- pressure-bearing intake

### Incident generation — Connects to

- world state
- factions
- legitimacy
- hub simulation
- mission triage

---

## 6.2 Mission triage

### Mission triage — Function

Presents current actionable work and forces prioritization.

### Mission triage — Produces

- routing decisions
- deferral decisions
- this-week operational planning shape

### Mission triage — Connects to

- incident generation
- hub outputs
- Agency state
- deployment flow

---

## 6.3 Deployment

### Deployment — Function

Commits a team and institutional resources to a selected mission.

### Deployment — Produces

- active operational assignment
- visible readiness/risk confirmation
- support and bottleneck commitment

### Deployment — Connects to

- team management
- support operations
- mission resolution

---

## 6.4 Mission resolution

### Mission resolution — Function

Converts mission inputs into bounded outcomes, follow-through quality, and fallout.

### Mission resolution — Produces

- success / partial / failure
- follow-through state
- fallout
- incident updates
- domain events

### Mission resolution — Connects to

- teams
- support
- specialists
- pressure
- reports
- future campaign state

---

## 6.5 Team management

### Team management — Function

Maintains deployable field capability across weeks.

### Team management — Produces

- team readiness
- role coverage
- recovery burden
- attrition and replacement pressure

### Team management — Connects to

- deployment
- mission resolution
- recovery systems
- Agency view

---

## 6.6 Support operations

### Support operations — Function

Tracks broad agency-side capacity for clean follow-through and throughput.

### Support operations — Produces

- support sufficiency or shortage
- follow-through degradation
- institutional bottleneck signals

### Support operations — Connects to

- mission resolution
- recovery
- reports
- procurement/support view

---

## 6.7 Specialist throughput

### Specialist throughput — Function

Tracks bounded agency-side capability lanes required for specific recovery or processing work.

### Specialist throughput — Produces

- specialist bottlenecks
- delayed jobs
- queue carryover

### Specialist throughput — Connects to

- recovery
- procurement
- support operations
- report notes

---

## 6.8 Pressure mechanics

### Pressure mechanics — Function

Turns unresolved problems, overload, and weak handling into strategic strain across systems.

### Pressure mechanics — Produces

- urgency
- degradation risk
- cross-system consequence
- next-week strategic friction

### Pressure mechanics — Connects to

- incidents
- support
- recovery
- legitimacy
- factions
- hub state

---

## 6.9 Factions and legitimacy

### Factions and legitimacy — Function

Represent the contested external environment the agency operates inside.

### Factions and legitimacy — Produces

- filtered opportunities
- access changes
- political or social consequence
- changing relationship posture

### Factions and legitimacy — Connects to

- hub simulation
- incident generation
- reports
- mission consequences

---

## 6.10 Hub simulation

### Hub simulation — Function

Surfaces socially mediated opportunities, rumors, leads, contracts, and services.

### Hub simulation — Produces

- rumors
- leads
- contracts
- district and faction-facing opportunity context

### Hub simulation — Connects to

- factions
- legitimacy
- prior outcomes
- mission triage

---

## 6.11 Procurement and support-facing logistics

### Procurement and support-facing logistics — Function

Handles material readiness, blocked replacements, repairs, and support-linked restoration pressure.

### Procurement and support-facing logistics — Produces

- resolved or unresolved gear constraints
- repair queue movement
- readiness-affecting material changes

### Procurement and support-facing logistics — Connects to

- team management
- support operations
- specialist throughput
- deployment

---

## 6.12 Reports

### Reports — Function

Explain outcomes, causes, fallout, and bottlenecks.

### Reports — Produces

- headline summaries
- report notes
- next-week strategic explanation

### Reports — Connects to

- events
- mission outcomes
- pressure
- Agency review
- next planning decisions

---

## 6.13 Persistence

### Persistence — Function

Preserves canonical campaign continuity across save/load.

### Persistence — Produces

- durable campaign state
- repeatable continuation
- migration-safe long-horizon play

### Persistence — Connects to

- every canonical system
- reports/history
- QA determinism validation

---

## 7. Weekly loop mapping reference

A simple system map of the weekly loop:

```text
Incident generation / hub simulation
-> Mission triage
-> Deployment
-> Mission resolution
-> Fallout / pressure / recovery update
-> Reports
-> Next week planning

Supporting systems active across that loop:

team management

support operations

specialist throughput

factions and legitimacy

economy / procurement

persistence

This is the project’s main operational skeleton.
```

---

## 8. System responsibility guidance

When adding or changing work, use these questions:

For a role

- what mission or system function does this role actually support?
- does it create a real coverage difference?
- is it bounded enough to stay legible?

For a system

- what state does it own?
- what weekly phase does it belong to?
- what decision does it improve or constrain?
- what outputs must it surface?
- what other systems depend on it?

If those questions are unclear, the role or system is probably too vague.

---

## 9. Common drift to avoid

Drift 1: Role inflation

Too many narrow operative roles create unreadable composition logic.

Drift 2: Support becoming character-sim

Agency-side throughput should stay systemic, not per-person scheduling drama.

Drift 3: System overlap without ownership

If multiple systems seem to own the same truth, implementation will drift.

Drift 4: View-driven pseudo-systems

A screen should surface system truth, not become a shadow system.

Drift 5: Narrative labels with no mechanical meaning

A role or system name must imply real gameplay consequence.

---

## 10. Suggested usage guidance

This reference should be used when:

- naming roles in issues or docs
- checking whether a new feature fits an existing system
- validating that UI copy uses the right terms
- scoping new work into the correct implementation boundary
- reviewing whether a proposed mechanic is bounded enough for Containment Protocol

It should not replace deeper system specs, but it should keep them aligned.

---

## 11. Acceptance criteria

This reference is effective when:

- terminology stays consistent across docs and issues
- new work is easier to place into the correct system
- role definitions remain bounded and useful
- QA, UI, and implementation use the same system language
- fewer specs drift into vague or overlapping ownership

---

## 12. Summary

The Roles and Systems Reference should give Containment Protocol a stable shared language for the parts of the institution and campaign machine that actually matter.

It should clarify:

- what roles do
- what systems do
- where those systems sit in the loop
- how they connect
- how to keep future work bounded and legible

The core question is:

when we name a role or a system, are we describing a real part of the machine, or just adding words around something still undefined?
