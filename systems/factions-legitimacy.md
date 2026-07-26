# Containment Protocol — Factions & Legitimacy Spec

## Purpose

This document defines the faction and legitimacy systems for Containment Protocol.

These systems express the fact that the agency does not operate in a vacuum.

They shape:

- access
- opportunity quality
- social filtering
- pressure
- contracts
- interference
- authority
- how visible or acceptable the agency’s actions are

Faction and legitimacy systems help the campaign feel institutional, political, and reactive.

This spec is for:

- system design
- implementation planning
- hub simulation integration
- incident generation integration
- report surfacing
- tuning
- QA planning

---

## Design goals

The faction and legitimacy systems should:

- make external actors matter to strategic play
- shape what kinds of work are available or easy
- create non-combat consequences for operational behavior
- influence information quality, access, and opportunity surfacing
- remain deterministic and legible
- support long-horizon campaign shifts
- reinforce that the agency is an institution embedded in a contested world

These systems should not:

- become a full diplomacy simulator
- become a dialogue-tree RPG relationship system
- create vague invisible “politics penalties” with no surfaced cause
- drown the player in dozens of equally important actors
- replace operational gameplay as the core loop

---

## 1. What factions are

A faction is an organized external or semi-external actor that has:

- goals
- presence
- leverage
- friction potential
- opportunity influence
- relationship posture toward the agency

A faction can be:

- an authority structure
- a rival institution
- a broker network
- a civic bloc
- a covert power center
- a market or service network
- a social/religious/political body
- a local district force

Factions matter because they shape:

- what the agency can know
- where the agency can act cleanly
- who offers opportunities
- who obstructs them
- what becomes visible or costly

---

## 2. What legitimacy is

Legitimacy is the degree to which the agency’s actions are tolerated, accepted, or institutionally supportable.

It is not exactly the same as popularity or reputation.

Legitimacy affects:

- access
- cover
- political tolerance
- public response quality
- clean handling of incidents
- the cost of visible failure

High legitimacy means:

- the agency can act with more institutional tolerance
- opportunities and access tend to be cleaner
- some actions cost less socially or politically

Low legitimacy means:

- the agency faces narrower clean-response windows
- more operations carry visibility cost
- access and support may become filtered or fragile
- the hub and faction systems become harsher

---

## 3. Faction/legitimacy philosophy

These systems should create strategic texture, not social sprawl.

Preferred pattern:

```text
Mission outcomes
+ public visibility
+ contracts honored or mishandled
+ district behavior
+ faction interaction
= relationship shifts and legitimacy change

Relationship shifts and legitimacy change
-> alter access, hub output, pressure, and opportunity quality
```

This keeps the system:

- reactive
- deterministic
- institution-facing
- clearly connected to prior play

---

## 4. Core system responsibilities

### Faction system responsibilities

- track relationship posture
- track presence where relevant
- influence opportunities, interference, and access
- react to player outcomes
- shape social filtering and pressure

### Legitimacy system responsibilities

- track how acceptable or exposed agency action is
- affect clean access and response quality
- react to visibility, collateral, and public-facing fallout
- shape future mission and hub conditions

---

## 5. Core faction entities

A faction should have conceptually:

```ts
interface FactionState {
  id: string
  relationship: number
  pressure: number
  presence?: Record<string, number>
  tags?: string[]
  knownToPlayer?: boolean
}
```

Possible meaning:

- relationship: cooperative to hostile posture
- pressure: how much active strain or contest this faction is creating
- presence: whether/how strongly they affect particular locations or surfaces

This is conceptual only; actual implementation may differ.

---

## 6. Core legitimacy entity

Legitimacy can be stored as part of agency state.

Conceptually:

```ts
interface AgencyState {
  legitimacy: number
}

interface LegitimacyState {
  current: number
  pressureActive?: boolean
  recentLossReason?: string
}
```

Use a single canonical owner.

---

## 7. Faction behaviors

Factions should shape gameplay through bounded influence, not constant direct intervention.

### 7.1 Opportunity shaping

Factions may:

- create contracts
- improve or worsen lead quality
- gate access to particular paths
- suppress or distort information
- create mutually exclusive commitments

### 7.2 Pressure generation

Factions may:

- contest space
- retaliate after visible actions
- increase friction in certain districts or sites
- narrow clean options

### 7.3 Access modification

Factions may:

- open clean routes
- close them
- create tolerated or tolerated-for-now operating conditions
- make intervention politically costly

### 7.4 Signal filtering

Factions can shape what the player hears.
A rumor may be:

- cleaner because of a trusted faction contact
- more distorted because a rival presence dominates a district

---

## 8. Legitimacy behaviors

Legitimacy should shape how easy it is for the agency to act without compounding consequences.

High legitimacy may allow:

- cleaner public-facing intervention
- better authority cooperation
- better contract or access quality
- less immediate visibility fallout from certain actions

Low legitimacy may cause:

- narrower clean response windows
- more legitimacy-sensitive incidents
- worse social filtering in hub information
- reduced institutional tolerance
- stronger costs for visible failure

---

## 9. Key inputs to faction and legitimacy change

### 9.1 Mission outcomes

Examples:

- clean success may improve trust
- public failure may worsen legitimacy
- partial containment may create mixed faction effects

### 9.2 Visibility and collateral

Examples:

- visible operations can cost legitimacy
- collateral spillover can worsen both legitimacy and faction posture
- quiet containment may preserve standing even if not perfect

### 9.3 Contracts and obligations

Examples:

- honoring a faction-backed contract may improve relationship
- abandoning it may worsen access or trust
- repeatedly using factions without meeting expectations may raise pressure

### 9.4 District / hub behavior

Examples:

- repeated instability in a district may alter faction presence
- social nodes may become less willing to cooperate
- service access may narrow under legitimacy pressure

### 9.5 Rivalry and comparative performance

Examples:

- strong agency standing may provoke rivals
- weakness may embolden interference
- successful intervention may change power posture in a region or district

**Implemented hooks (SPE-2699 / SPE-2700 / SPE-2701 / SPE-2702 / SPE-2704 / SPE-2705):** ranking-derived
comparative pressure (`buildRivalPressure`) adjusts contract payout scalars and recruit quality
deltas, scales negative external-support reliability drift (standing-shaped forgiveness), composes
a standing fallout-penalty scale onto emergency gray-market waiver fallout ticks (funding/containment
bands; precedent multiplier unchanged), and after public disclosure exposure applies a
protective/coercive `postExposureTrustDelta` into regional trust → cooperation bands. Distant
archive-signature reappearance (SPE-854) projects a bounded cross-jurisdiction coordination packet /
shared signature alert for agency and weekly report surfaces. Competitive/severe rival pressure also
drives bounded hidden-cell **funding theft** at week-close (`hiddenCellStrategicInterference`) with
a player-legible interference note — not a full adversary-org or detection sim. Abstract peer
baseline only — no per-rival squad or full multi-region org simulation. Standing award math remains
separate.

---

## 10. Faction and legitimacy outputs

These systems should produce bounded outputs the player can feel.

### Faction outputs

- new or lost contracts
- access path changes
- presence changes in hub/districts
- information quality shifts
- interference pressure
- improved or worsened cooperation

### Legitimacy outputs

- response cleanliness changes
- access restrictions
- higher or lower cost of public operations
- more or less forgiving hub/opportunity conditions
- surfaced warnings in reports/projections

---

## 11. Hub integration

The hub is one of the main surfaces where faction and legitimacy should be visible.

Examples:

- a faction is present in the hub this week and offers work
- rumor quality changes because a district is dominated by suspicious actors
- low legitimacy causes some services to become less available or more filtered
- opportunities appear differently depending on who trusts the agency

This helps keep these systems visible without requiring constant explicit diplomacy screens.

---

## 12. Incident generation integration

Factions and legitimacy should influence incident generation.

Examples:

- low legitimacy increases visibility-sensitive incidents
- strong faction presence increases faction-linked contract opportunities
- unresolved political or civic pressure creates new social incident types
- rival interference generates contested or distorted incident framing

This helps the world feel reactive.

---

## 13. Report integration

Reports should surface faction and legitimacy causes clearly.

Examples:

- Legitimacy pressure narrowed clean response options.
- Civilian visibility increased local authority friction.
- Faction support improved contract quality this week.
- Rival interference distorted district rumor quality.
- Failure to honor the agreement worsened faction posture.

These notes are vital because faction and legitimacy systems can otherwise feel too abstract.

---

## 14. Tuning levers

Useful tuning levers include:

- relationship gain/loss intensity
- legitimacy damage thresholds
- visibility sensitivity
- faction presence influence on hub output
- access bonus/penalty strength
- contract quality shifts by relationship
- rival pressure escalation rate
- district filtering strength

These should be bounded and explicit.

---

## 15. Non-goals

These systems should not become:

- A full diplomacy game: The player is running operations, not negotiating every clause with every actor.
- A reputation-only number game: Relationship and legitimacy should shape real access and opportunity, not just labels.
- A narrative conversation tree system: Text and surfacing may imply social context, but the system should remain state-driven.
- A punishment fog: If the player does not know why a faction or legitimacy shift happened, the system is failing.

---

## 16. Common failure modes

- Failure mode 1: Factions feel cosmetic
  - If they do not affect opportunity, access, or pressure, they become lore wallpaper.
- Failure mode 2: Legitimacy is just a number
  - If it never changes player decisions, it is dead weight.
- Failure mode 3: Too many actors matter equally
  - This creates unreadable politics.
- Failure mode 4: Consequences are invisible
  - If a faction relationship worsens but nothing changes in hub/mission/report surfaces, the system is not legible.
- Failure mode 5: Too much abstraction
  - If every consequence is “relationship -5,” the player has no concrete mental model.

---

## 16.1 Extended relationship, legitimacy, and obligation contracts (SPE-35, SPE-50–SPE-52)

### Faction contacts and relationship layer (SPE-35)

Faction stance is **not** a single friendliness scalar. Canonical relationship modeling should allow:

- **Known vs hidden modifiers** (public posture vs clandestine leverage).
- **Bounded historical context** so recurring contacts remember prior deals, slights, or cover stories.
- **Ambiguous suspicion cues** that can be misread without extra intel.
- **Mixed states** where hostility, negotiation, and exchange coexist (frenemy logistics, sanctioned rivals).
- **Recurring contact memory** for brokers, patrons, or fixers.
- **Clandestine / support networks** that depend on **identity protection** — exposure collapses access paths.

### Legitimacy policy shell (SPE-50)

Treat **SPE-50** as the shared **legitimacy / sanction / authorization policy** parent: sanction levels, legal cover, consent, credentials, protocol correctness, and doctrine fluency. Route specialized access work to child issues instead of bloating the parent — for example credential transit (**SPE-600**), rank/quarter/audience rules (**SPE-601**), jurisdiction admission matrices (**SPE-602**), and magical access-state grammar (**SPE-406**).

`LegitimacyState` separates two bounded axes (SPE-2719):

- `sanctionLevel` is **institutional legitimacy**: sanctioned, covert, tolerated, or unsanctioned authorization.
- `operationalCoverLevel` is **operational exposure**: open, deniable, or compromised.

Legacy saves infer `covert` sanction as deniable cover and every other sanction as open cover. Explicit cover can therefore diverge under the same institutional posture without renaming sanction values. The first bounded gate is sanctioned gray-market procurement: open or compromised cover remains audit-blocked, while deniable cover can reach the broker without creating an emergency-waiver record or its fallout. The emergency waiver remains a separate crisis response for sanctioned operations that lack deniable cover.

### Persisted authority graph foundation

SPE-2720 adds a graph-local persistence seam beneath the broader SPE-788 politics layer. An
authored authority graph may advance one eligible relationship strength at week-close using the
existing consequence resolver. Selection is deterministic by edge and pressure-channel ID,
movement is capped at five points, the same closed week cannot apply twice, and history retains 52
entries. This state does not alter faction standing, negotiation, commerce, operational cover, or
SPE-39 rival/interference/upkeep calculations.

SPE-2722 adds one bounded consumer without turning the graph into a general faction simulator.
When Rally Support Staff uses a contractor, the contractor may resolve one persisted `aid` edge
to an explicitly linked live faction after the support amount is fixed. A positive edge moves
faction reputation by `+1`; a denying edge moves it by `-1`. Alias resolution and graph
sanitization use the authority helpers, selection is deterministic, and an asset/week marker
prevents duplicate same-week application. Empty/legacy graphs and missing asset, node, or faction
references are no-ops. Institutional legitimacy and operational cover are not rewritten, and
market, negotiation, command/council, secrecy/media, commerce, and SPE-39 paths remain isolated.
Delayed hidden and contradicted claims remain explanatory graph output and do not apply this
durable reputation movement.

### Patron obligations and symbolic social debt (SPE-51)

Gifts, hospitality, aid, ritual participation, favors, promises, tribute, and sponsor-routed boons should materialize as **durable obligation objects** with negotiation posture, hidden leverage, inheritance constraints, and relationship-specific fallout. This is closer to **contracted social debt** than “reputation with flavor text.”

### Internal cohesion and agendas (SPE-52)

Factions behave as **internally dynamic institutions**: cohesion, agenda pressure, reliability, and distortion tendency change what intel looks like, which opportunities are real, and when cooperation is performative. Model etiquette-sensitive anomaly polities, proxy conflict, and service-extraction dynamics as **internal agenda expressions**, not only external hostility sliders.

---

## 17. Example faction/legitimacy chain

Mission partial with visible fallout
-> district attention rises
-> legitimacy decreases
-> authority cooperation weakens
-> hub rumors become more filtered
-> next week's clean access options narrow

And:

Faction-backed contract honored cleanly
-> relationship improves
-> better lead quality appears
-> faction presence opens cleaner opportunity path in hub

These are good chains because they are:

- causal
- bounded
- visible
- strategically meaningful

---

## 18. Testing expectations

Tests should verify:

- mission outcomes change faction/legitimacy state deterministically
- faction presence affects hub output
- legitimacy affects opportunity/access conditions
- surfaced report notes match real domain changes
- same input state produces same output shifts
- no unrelated systems are accidentally entangled

---

## 19. Acceptance criteria

Factions and legitimacy are working when:

- faction posture influences at least one real gameplay path
- legitimacy changes at least one real access, visibility, or opportunity condition
- mission and campaign outcomes can shift both systems
- player-facing outputs explain major changes
- the systems remain bounded and deterministic

---

## 20. Summary

The faction and legitimacy systems in Containment Protocol should make the world feel politically and socially real without turning the game into a separate diplomacy sim.

They should:

- react to agency behavior
- change what kinds of action are cleanly available
- shape opportunity quality and information filtering
- create long-horizon consequences for visible success and failure

The player should feel:

the agency is not just fighting threats — it is operating inside a contested world that notices how it behaves.
