# Containment Protocol — Hub Simulation Spec

## Purpose

This document defines the hub simulation system for Containment Protocol.

The hub is the agency’s non-mission strategic surface between deployments.
It is where the player reviews:

- rumors
- leads
- contracts
- faction presence
- district behavior
- services
- socially filtered information
- lower-intensity operational opportunities

The hub is not a free-roam city game.
It is a bounded simulation layer that turns campaign state into actionable surfaced opportunity.

This spec is for:

- system design
- implementation planning
- UX design
- content integration
- tuning
- QA planning

---

## Design goals

The hub simulation should:

- act as a live staging ground between operations
- surface opportunities that emerge from state
- reflect faction presence, district conditions, and prior outcomes
- generate bounded rumors and leads
- support partial, filtered, or misleading information
- create pacing variation between direct incident responses
- remain deterministic and legible

The hub should not:

- become a broad city-life simulator
- become a full dialogue-tree system
- replace mission routing as the main operational decision layer
- duplicate world simulation logic in UI
- produce clutter without strategic meaning

---

## 1. What the hub is

The hub is the campaign-facing opportunity and information surface.

It is where:

- simulation state becomes visible in socially mediated form
- non-mission choices and lower-intensity commitments can appear
- the player interprets signals before deciding what to route into action
- faction presence and institutional posture become tactically useful

The hub is not:

- the whole world
- a broad exploration game
- an all-purpose menu shell with no simulation weight

---

## 2. Hub simulation philosophy

The hub should be the agency’s “between missions” operational environment.

Its job is to:

- translate campaign state into opportunities
- show consequences of legitimacy, faction presence, and prior action
- provide softer or indirect paths into the same strategic loop
- create a sense that the agency exists in a living social/urban system

Preferred model:

```text
Campaign state
+ faction presence
+ district conditions
+ recent outcomes
+ legitimacy / pressure
= surfaced hub opportunities, rumors, leads, services, and constraints
```

The hub should feel caused, not decorative.

---

## 3. Hub simulation outputs

The hub may surface:

- rumors
- leads
- contracts
- faction opportunities
- service access
- district-specific incidents
- low-intensity social or administrative problems
- misleading or socially filtered information
- access restrictions or availability changes

Not every output needs to become a mission immediately.
Some are:

- information
- pressure indicators
- opportunity seeds
- strategic context

---

## 4. Core hub loop

Campaign state updates
-> hub simulation reads current world/agency/faction conditions
-> generate rumors / leads / opportunities / presence changes
-> player reviews surfaced outputs
-> player converts some outputs into action
-> outcomes feed back into hub state next week

This keeps the hub tightly connected to the main weekly campaign loop.

---

## 5. Hub simulation stages

### Stage A — Read campaign context

Hub simulation should read:

- current week
- unresolved incidents
- recent mission outcomes
- faction relationships and presence
- legitimacy state
- district or service-node state if implemented
- agency standing
- known information
- recent visibility or collateral outcomes

This determines what the hub can plausibly surface.

### Stage B — Build hub opportunity pools

Create possible output candidates based on:

- factions currently present
- district packets
- recent case outcomes
- current local pressure
- known urban/service structures
- contracts or lead seeds
- rumor templates
- social filtering rules

Examples:

- faction contact offers follow-up contract
- district broker surfaces partial lead
- clinic ward emits low-confidence incident signal
- service node becomes unavailable due to pressure
- rumor appears because last week’s operation increased local visibility

### Stage C — Apply generation rules

Apply deterministic rules to choose bounded hub outputs.

Examples:

- if legitimacy is low, surface more filtered or cautious opportunities
- if faction presence is high, surface faction-linked actions
- if district instability rose, increase rumor generation there
- if a prior mission partial created fallout, surface localized follow-up leads
- if an allied contact is active, improve opportunity quality

### Stage D — Apply social filtering and confidence

Hub outputs should not all be clean truths.

A surfaced output may be:

- clear
- partial
- misleading
- biased by source
- incomplete because of legitimacy, faction, or district conditions

This is one of the hub’s main jobs:
convert world truth into player-facing social information.

### Stage E — Surface to the player

The resulting hub state should present:

- a manageable number of meaningful items
- enough variety to create real choice
- enough explanation that the player can act intelligently
- enough uncertainty that recon and interpretation still matter

---

## 6. Hub content categories

### 6.1 Rumors

Low-confidence surfaced information.

Purpose:

- suggest opportunities
- foreshadow incidents
- hint at district/faction behavior
- support partial-information play

### 6.2 Leads

More actionable and higher-signal than rumors.

Purpose:

- bridge from information into routing
- provide mission seeds
- create stronger but not omniscient direction

### 6.3 Contracts

Structured opportunities or requests.

Purpose:

- offer explicit reward or obligation framing
- tie the hub to economy/faction systems
- create external demand on agency resources

### 6.4 Services

Bounded agency-side or social resources available through the hub.

Examples:

- market access
- treatment options
- specialized assistance
- brokered information
- temporary access paths

These should remain bounded and system-relevant.

### 6.5 District behavior

If districts exist, the hub may express:

- local instability
- service-node shifts
- rumor density
- faction presence
- recurring incident patterns

This helps the hub feel structured without becoming free-roam.

---

## 7. Hub districts and nodes

If implemented, the hub may be partitioned into districts or service nodes.

Examples:

- dockside
- broker lane
- clinic quarter
- foundry edge
- archive district
- authority quarter

Each district may contribute:

- opportunity patterns
- service access
- rumor flavor and filtering
- pressure signatures
- faction presence behavior

Design rule:

Districts should improve opportunity structure, not become navigation bloat.

---

## 8. Faction presence in the hub

Factions should influence the hub visibly.

They may affect:

- which contracts appear
- what rumors are available
- what services or access paths exist
- how filtered information becomes
- whether actions are safer, riskier, or politically costly

Examples:

- strong faction presence may unlock better opportunities
- rival faction presence may distort or constrain hub output
- absent or hostile factions may reduce clean access to certain paths

---

## 9. Hub-state persistence

A mature hub system may persist:

- district conditions
- active rumor/lead pools
- faction presence
- opportunity exhaustion
- recent local consequences

This allows:

- continuity across weeks
- place identity
- follow-on opportunity chains
- better player memory and planning

If persistence is limited, the game should still preserve deterministic continuity through causal generation.

---

## 10. Hub interaction patterns

The player should be able to:

- browse surfaced opportunities quickly
- compare rumor vs lead quality
- inspect source and confidence
- convert relevant outputs into operational paths
- ignore low-value signals safely when appropriate
- understand what is changing in the hub and why

The hub should not require:

- wandering
- dialogue-tree grinding
- hidden click hunts
- repeated meaningless browsing

---

## 11. Hub and partial information

The hub is one of the best places to express partial information.

Useful kinds of uncertainty:

- source bias
- district distortion
- faction-filtered information
- delayed reporting
- socially amplified false attribution
- incomplete but directionally useful truth

This should make the player interpret, not just consume.

---

## 12. Hub and campaign feedback

Hub simulation should react to what happened last week.

Examples:

- failed containment increases local fear and rumor distortion
- successful operations improve access or trust
- faction help increases future offers
- visible collateral damage worsens social filtering
- repeated neglect causes district rumor density or opportunity quality to shift

This feedback makes the campaign feel alive.

---

## 13. Hub and pacing

The hub helps pace the game by:

- giving the player breathing space between hard deployments
- offering softer or indirect opportunities
- letting information gathering matter
- changing tempo without changing the core loop

A good hub gives variation without undermining pressure.

---

## 14. Surfacing rules

The hub should clearly surface:

- what is available
- who it comes from
- how reliable it is
- why it matters
- whether it is time-sensitive
- which broader conditions are shaping it

Examples of good surfaced output:

- rumor title + short text + confidence
- faction-linked opportunity with visible source
- service node showing access restriction due to legitimacy pressure
- district packet showing rising instability

---

## 15. Tuning levers

Hub simulation tuning may include:

- max opportunities per week
- rumor vs lead ratio
- misleading-output rate
- faction influence weight
- district influence weight
- opportunity persistence
- hub response to recent outcomes
- service-node volatility
- low-intensity side-opportunity frequency

These should be tuned to support:

- clarity
- pressure
- variety
- boundedness

---

## 16. Non-goals

The hub should not become:

- A free-roam city sim: No open wandering required to make core decisions.
- A quest web simulator: Opportunities may branch, but the game should not become a sprawling narrative graph tool.
- A dialogue-first RPG layer: Social information matters, but the game remains systems-first.
- A duplicate mission board: The hub is for opportunity surfacing and social filtering, not a second copy of operations routing.

---

## 17. Common failure modes

- Failure mode 1: Flavor clutter
  - Too many low-value rumors or ambient items reduce strategic clarity.
- Failure mode 2: No causality
  - If hub opportunities do not reflect prior outcomes or faction presence, the hub feels fake.
- Failure mode 3: No differentiation
  - If rumors, leads, and contracts all feel identical, the hub loses function.
- Failure mode 4: Overgrowth
  - If every district becomes a separate subgame, navigation and cognition collapse.
- Failure mode 5: UI recomputation
  - If feature code invents hub logic rather than surfacing domain state, consistency breaks.

---

## 18. Example hub flow

Last week:

- one district saw visible collateral
- one faction relationship improved
- one incident was partially contained

This week:

-> district rumor density rises
-> one rumor is misleading due to local panic
-> one faction-linked contract appears
-> one service path becomes more expensive or less clean
-> player reviews hub and decides what becomes operational work

This is the desired pattern:
state causes surfaced change.

---

## 19. Testing expectations

Hub simulation tests should verify:

- deterministic opportunity generation
- faction presence affecting output
- rumor/lead filtering behavior
- district-aware output where implemented
- reaction to recent outcomes
- bounded opportunity counts
- surfaced output correctness without duplicated feature logic

---

## 20. Acceptance criteria

Hub simulation is working when:

- the hub can generate meaningful non-static surfaced opportunities
- factions affect what appears there
- partial or misleading information exists in a bounded deterministic way
- prior outcomes shape future hub output
- the player can use hub signals to make better strategic decisions
- the system stays bounded and legible

---

## 21. Summary

The hub simulation in Containment Protocol should feel like the social and informational face of the campaign.

It should:

- turn campaign state into surfaced opportunity
- preserve uncertainty
- reflect factions, districts, and prior outcomes
- support strategic pacing
- remain bounded and systems-driven

The player should feel:

the world is talking back through the hub, but never cleanly, and reading it well is part of running the agency.
