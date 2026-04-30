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

### Condition

A named status applied to an agent or anomaly that affects combat, mission, or recovery mechanics. Conditions have carrier rules that control which entity types can hold them.

Examples: fatigued, injured, alerted, disoriented.

### Faction

A persistent organization, bloc, institution, rival, or interest group with its own pressure, alignment, and response to player activity.

### Faction standing

A per-faction numeric value in `[-20, +20]` tracking the agency's relationship with that faction. Increases on mission rewards or standing-change events; decreases on failure, faction pressure, or enemy-faction success. Distinct from the broad agency-wide `Standing`.

### Legitimacy

The agency’s recognized authority, tolerated presence, or socially/politically acceptable operating position.

Legitimacy affects access, cooperation, risk, and opportunity quality.

### Reputation tier

The discrete label derived from faction standing: `hostile | unfriendly | neutral | friendly | allied`. Governs access to faction contacts, recruit unlocks, and cooperation modifiers.

### Standing

The agency's comparative rank, reputation, or perceived competence relative to rivals or external institutions.

### Tag

A string label applied to agents, cases, gear, or anomalies that drives scope matching, modifier targeting, niche evaluation, and protocol activation. Tags are not boolean flags — they participate in multi-dimensional matching across skills, protocols, and encounter resolution.

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

### Case stage

The current escalation level of a case, numbered 1–5. Stage 4+ triggers major incident eligibility. Stage 5 is terminal (maximum escalation). Stages advance on deadline lapse or failed containment.

### Escalation

A worsening of threat state, urgency, severity, or operational consequences over time or due to ineffective response.

### Incident archetype

The thematic template governing a major incident's mechanics, boss entities, and difficulty scaling. Five archetypes: `mass_exposure`, `infrastructure_collapse`, `hostile_escalation`, `occult_surge`, `containment_breach`. Archetype is matched from case tags.

### Major incident

A high-severity case activated when a case reaches Stage 4 (or Stage 3 with deadline ≤ 1 week, or raid kind). Major incidents use archetype-based scaling and may include boss entities at Stage 3+.

### Spawn

A case created as a consequence of another case resolution, faction pressure, world activity, or pressure threshold breach. Spawned cases appear in the weekly report with a source attribution.

### Threat family

The category label that classifies the nature of a case threat for consequence routing and escalation behavior. Examples: `occult`, `hazmat`, `signal`, `biological`, `containment`.

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

### Intel confidence

A normalized ratio in `[0.18, 0.98]` representing how much useful intelligence was surfaced during a case recon pass. Higher values indicate more revealed hidden modifiers and stronger recon coverage. Displayed in the deployment readiness panel as a low/medium/high band.

### Recon

The pre-deployment intel evaluation process that surfaces hidden case modifiers and produces an `intel confidence` value. Recon results are not persisted — they are recomputed when the deployment panel is rendered.

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

### Market listing

A single purchasable entry in the procurement market. Listings have a source (recipe, material, or direct equipment), a price, and a seeded availability value that resets each market cycle.

### Market pressure

A global economic factor (one of `stable | elevated | volatile | crisis`) that modifies procurement pricing and availability across all market listings for the current cycle.

### Protocol

An agency doctrine modifier that activates during mission resolution when its unlock condition (based on clearance level, containment rating, or funding) and activation context are both satisfied. Protocols apply per-agent based on scope matching. Sometimes called _agency protocol_ to distinguish from Threshold Court protocol-contact events.

### Protocol scope

The targeting rule that limits which agents a protocol applies to: `all_agents`, `role` (specific role list), or `tag` (agent must carry any matching tag).

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

### Modifier cap

The bounded floor and ceiling applied to runtime modifier aggregation before an outcome band is resolved. Currently `[-3, +3]`. Prevents extreme stacking from making outcomes deterministically unwinnable or trivially easy.

### Overload

A state where demand exceeds bounded institutional capacity.

### Resistance profile

A predefined anomaly-side defense configuration pairing a primary tag (e.g. `hardened`, `ethereal`, `adaptive`) with countering tags and a modifier delta. Six profiles exist. A matching countermeasure neutralizes or reverses the resistance delta.

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
