# Containment Protocol — Glossary

## Purpose

This glossary defines canonical project terminology for design, implementation, content, UI, and testing work.

Use these terms consistently across:

- code
- issues
- specs
- UI copy
- reports
- test plans
- content templates

If a synonym appears in discussion, convert it to the canonical term in documentation.

---

## Core game terms

### Agency

The player-controlled organization responsible for intake, preparation, deployment, recovery, support, procurement, and strategic growth.

The agency is the primary unit of play.

### Operative

A field-capable member of the agency who can be trained, equipped, assigned, deployed, injured, recovered, or lost.

### Team

A bounded operational unit composed of one or more operatives.

A team is the default field deployment unit.

### Support

Agency-side non-field operational capacity that improves or constrains follow-through, recovery, throughput, and institutional performance.

Support is not a deployable squad.

### Support specialist

A bounded institutional capability role that changes what the agency can sustain or do.

Examples:

- maintenance specialist
- engineer
- handler
- doctrine expert

Support specialists are agency-side system actors, not freeform character-sim units.

### Candidate

A person in the recruitment funnel who has not yet become a full operative.

### Contact

A relationship-bearing actor or organization that affects access, information, opportunities, or support.

### Faction

A persistent organization, bloc, institution, rival, or interest group with its own pressure, alignment, and response to player activity.

### Legitimacy

The agency’s recognized authority, tolerated presence, or socially/politically acceptable operating position.

Legitimacy affects access, cooperation, risk, and opportunity quality.

### Standing

The agency’s comparative rank, reputation, or perceived competence relative to rivals or external institutions.

---

## Campaign structure terms

### Week

The primary campaign simulation step.

A week is the default cadence for:

- pressure updates
- incident escalation
- support changes
- recovery
- hub generation
- report output
- systemic consequences

### Advance week

The canonical campaign simulation transition that processes a full weekly state update.

### Campaign state

The total persistent simulation state of the game across all systems.

### Hub

The non-mission staging layer where the player reviews information, opportunities, rumors, services, and strategic options between deployments.

### Opportunity

A bounded actionable item surfaced to the player from simulation state.

Examples:

- contract
- rumor lead
- social opening
- service access

- situational response option

### Rumor

A bounded piece of surfaced information that may be accurate, partial, misleading, filtered, or socially mediated.

### Lead

A stronger opportunity signal than a rumor, typically implying a more actionable operational path.

### Contract

A formalized mission or task offer with explicit reward, obligation, or relationship implications.

---

## Operational terms

### Incident

A simulated problem, anomaly, threat, crisis, or pressure source requiring attention.

### Mission

A player-routed operational response to an incident or objective.

### Mission intake

The phase where incidents/opportunities enter player consideration.

### Triage

The process of evaluating and routing incidents by urgency, severity, reward, risk, or strategic importance.

### Routing

Assignment of an incident or opportunity into a response path.

### Deployment

The act of assigning a team and resources to an operational path.

### Readiness

A bounded measure of whether a team or agency can effectively act now.

### Follow-through

The degree to which an intended operational outcome is successfully carried through after deployment and resolution pressures are applied.

### Resolution

The deterministic process that converts mission inputs and current state into operational outcomes.

### Outcome

The result of an operation or weekly system pass.

Typical categories may include:

- success
- partial
- fail
- escalated
- delayed

### Fallout

A downstream negative consequence caused by overload, failure, delay, misallocation, visibility, collateral damage, or systemic pressure.

### Collateral risk

The risk that an operational outcome causes secondary harm outside the intended target.

### Escalation

A worsening of threat state, urgency, severity, or operational consequences over time or due to ineffective response.

### Threat drift

The deterministic change in threat state caused by time, pressure, unresolved incidents, or campaign conditions.

### Weakest-link resolution

A resolution pattern where the limiting factor in team/system readiness disproportionately shapes mission outcome.

---

## Information terms

### Knowledge

Persistent player-accessible understanding of the world, threats, factions, or systems.

### Intel

Operationally useful information that affects routing, readiness, deployment, or outcome quality.

### Visibility

How clearly the player can perceive system state, risk, tradeoffs, or consequence causes.

### Decision legibility

The degree to which the player can understand why a result happened and what can be changed next time.

### Partial information

A state where relevant facts are not fully known to the player.

### Misleading output

Surfaced information that is deterministic but incomplete, filtered, biased, or partially wrong.

### Belief track

A bounded external-party perception state attached to a `CaseInstance`. Tracks how witnesses, institutions, and crowds currently interpret a case — independently of objective truth (`factTruth`).

Four tracks:

- `factTruth` — objective ground truth (immutable by divergence/reveal movers)
- `witnessInterpretation` — how direct witnesses read the situation
- `institutionalJudgment` — how governing institutions or official bodies have ruled
- `crowdConsensus` — how public/crowd perception has settled

Each track holds one of four tiers: `clear | uncertain | suspected | condemned`.

See `src/domain/beliefTracks.ts`.

### Belief tier

One of four ordered values representing how strongly a belief track has condemned or cleared a subject: `clear → uncertain → suspected → condemned`.

Higher tiers on `institutionalJudgment` and `crowdConsensus` tracks contribute to case pressure in the simulation loop via `getCasePressureWithBelief`.

### Belief divergence

A state where one or more public-facing belief tracks (`witnessInterpretation`, `institutionalJudgment`, `crowdConsensus`) differ from `factTruth`. Represents the gap between objective reality and external-party perception.

---

## Resource and progression terms

### Funding

The agency’s money-like strategic resource used for upkeep, procurement, facilities, and institutional growth.

### Procurement

The acquisition flow for gear, supplies, and capability inputs.

### Facility

A base or institutional structure that expands or modifies agency capability.

### Upgrade

A persistent agency improvement that changes future state or available actions.

### Capacity

The bounded amount of work a system can sustain in a time step.

Examples:

- support capacity
- specialist capacity
- operational capacity

### Bottleneck

A constrained resource, process, or role whose shortage limits downstream output.

### Throughput

How much useful work a system can complete in a given weekly step.

### Recovery

The process of returning personnel, gear, or systems toward usable state after strain or damage.

### Downtime

The period where assets or operatives are unavailable due to recovery, repair, or institutional lag.

### Attrition

Loss, degradation, or depletion of personnel or institutional effectiveness over time.

### Replacement pressure

The strain created when the agency must refill depleted personnel or capability.

---

## Pressure and friction terms

### Pressure

A bounded systemic force that pushes the agency toward overload, degradation, delay, or strategic compromise.

Examples:

- case load
- support strain
- faction pressure
- legitimacy pressure
- time pressure

### Support strain

Pressure caused by insufficient support capacity relative to operational demand.

### Coordination friction

A bounded agency-side penalty representing degraded operational coherence under overload.

### Overload

A state where demand exceeds bounded institutional capacity.

### Handoff mismatch

A bounded friction where a process transition between systems, roles, or stages degrades outcome quality.

### Command-coordination quality

The bounded state describing whether the agency can maintain clean operational coherence under concurrent load.

---

## Spatial / world terms

### Region

A large-scale campaign geography unit.

### Zone

A bounded strategic area within a region.

### Site

A mission-relevant location or target space.

### Hub district

A bounded subsection of the hub that carries distinct opportunity, service, rumor, or pressure behavior.

### Packet

A reusable bounded content or simulation bundle representing a place, opportunity set, or local system behavior.

---

## UI / output terms

### Report

The player-facing summary of what happened in a weekly step or operational phase.

### Report note

A concise surfaced explanation generated from precomputed domain state.

### Projection

A player-facing preview of likely state, pressure, or consequences based on current conditions.

### Status bar / pressure strip

A high-level UI summary of global agency or campaign pressure.

### Contract board

A surfaced list of actionable opportunity items.

---

## Design terms

### Deterministic

Outcomes are caused by explicit state and rules rather than hidden randomness as the primary driver.

### Bounded

A system is intentionally constrained in scale, number of variables, and interaction surface to preserve legibility and implementation discipline.

### Canonical state

The single source of truth for a piece of game state.

### Derived state

A value computed from canonical state for display, validation, or downstream use.

### Source of truth

The authoritative owner of a given state or rule.

### Surface / surfaced output

Information shown to the player from precomputed domain state.

### Do not duplicate logic

UI, reports, and projections should surface domain decisions rather than recompute them independently.

---

## Non-goals vocabulary

Use these phrases to identify drift:

### Staffing roster sim

A per-person support-management system with granular staffing schedules and assignment micro-logic.

### Specialization matrix explosion

An uncontrolled proliferation of specialist roles and bespoke interactions.

### Communications minigame

A separate direct-play subsystem for message routing, relays, or chain-of-command interaction.

### Free-roam city game

A hub implementation that behaves like a broad navigation/exploration RPG rather than a bounded opportunity surface.

### Character-by-character management game

A design drift where institutional systems become an individual life-sim.

---

## Preferred canonical wording

Use:

- agency
- operative
- team
- support
- support specialist
- incident
- mission
- triage
- routing
- deployment
- readiness
- follow-through
- fallout
- pressure
- overload
- coordination friction
- hub
- opportunity
- rumor
- lead
- report note
- deterministic
- bounded
- canonical state

Avoid casual substitutes in formal docs when precision matters.
