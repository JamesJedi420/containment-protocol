# Containment Protocol — Incident Generation Spec

## Purpose

This document defines the incident generation system for Containment Protocol.

Incident generation is responsible for creating and updating the campaign’s incoming problem space:

- threats
- anomalies
- crises
- contracts
- response-worthy disruptions
- pressure-bearing situations

It is one of the main drivers of the weekly loop.

A good incident generation system should:

- keep the campaign alive
- create triage pressure
- reflect world state
- respond to prior outcomes
- preserve determinism
- produce varied but legible operational problems

This spec is for:

- system design
- content design
- simulation implementation
- tuning
- QA planning

---

## Design goals

Incident generation should:

- produce a credible flow of work for the agency
- scale with campaign state
- reflect unresolved pressure and prior outcomes
- interact with faction, hub, region, and legitimacy systems
- create real prioritization tension
- remain deterministic and inspectable
- produce incidents that are routable through existing mission systems

Incident generation should not:

- feel random for its own sake
- become a full procedural story engine
- flood the player with low-value noise
- create problems that the rest of the game cannot meaningfully answer
- rely on hidden chaos instead of state-driven causality

---

## 1. What an incident is

An incident is a bounded problem entering the campaign.

Examples:

- a localized anomaly
- a social disturbance with hidden cause
- a faction-linked disruption
- an infrastructure event with operational risk
- a crisis requiring response before it escalates
- a contract-worthy intervention opportunity

An incident is not:

- the mission itself
- a rumor
- a full narrative chapter
- just ambient world flavor
- an infinitely unfolding plotline

It is the unit of intake pressure that enters triage and may become a mission.

---

## 2. Incident generation philosophy

Containment Protocol should generate incidents from state, not from abstract encounter randomness.

Preferred model:

```text
Current world state
+ region / site context
+ faction behavior
+ unresolved pressure
+ recent outcomes
+ hub / legitimacy / knowledge conditions
= incident generation candidates
```

This means:

- incidents should feel caused
- the player should gradually understand the system
- repeated mistakes should produce recognizably related pressures
- the world should seem reactive rather than arbitrary

---

## 3. Incident generation stages

Incident generation should be understood as a weekly pipeline.

### Stage A — Read campaign context

Read relevant state such as:

- current week
- unresolved incidents
- regional pressure
- faction presence and hostility
- legitimacy state
- hub activity
- prior mission outcomes
- escalation backlog
- facility / support / readiness posture where relevant
- world tags or active domain conditions

This defines what kinds of incidents are plausible.

### Stage B — Build candidate pools

Construct possible incident candidates based on:

- location
- pressure type
- faction influence
- domain/theme
- current campaign phase
- known content packet availability

Candidate pools should be bounded and explainable.

Examples:

- infrastructure disruption candidates
- urban anomaly candidates
- faction-sensitive opportunities
- legitimacy-sensitive public incidents
- unresolved chain follow-ups
- district-specific hub spillovers

### Stage C — Apply generation rules

Use deterministic rules to decide which incidents appear this week.

Examples of rule inputs:

- if unresolved district pressure is high, generate escalation-sensitive local incidents
- if faction presence increased, add faction-linked candidates
- if prior case failure spilled visibility, bias toward legitimacy-sensitive incidents
- if hub district state worsened, surface local follow-on work

This is where the game turns state into work.

### Stage D — Attach severity, visibility, and escalation context

Each generated incident should have:

- severity band
- escalation state
- visibility/public-exposure state where relevant
- source/context tags
- likely response pressure markers

This gives the incident routing weight.

### Stage E — Surface to player systems

Generated incidents may become:

- direct incident intake items
- mission-routing candidates
- contract board items
- lead-linked operational opportunities
- urgency-bearing entries in the operations layer

Not every generated signal needs to become a direct mission immediately. Some may first appear as rumors or leads depending on the system path.

---

## 4. Core generation inputs

### 4.1 World and location state

Incident generation should respect:

- region
- zone
- site
- hub district or neighborhood if relevant
- infrastructure state
- local pressure signatures

Examples:

- port districts generate different problems than clinic wards
- industrial corridors generate different risk than administrative centers
- recurring site instability can create follow-on incidents nearby

### 4.2 Faction state

Faction state can influence:

- which incidents appear
- who is involved
- how visible or filtered the incident is
- whether the incident appears as a contract, rumor, or direct emergency

Examples:

- hostile faction presence increases disruptive or contested incidents
- allied presence produces higher-trust but politically sensitive contracts
- rival presence may distort rumor quality or narrow clean access

### 4.3 Prior outcomes

Incident generation should be influenced by:

- resolved missions
- partial outcomes
- failed containment
- collateral spillover
- escalation left unresolved
- hub-side consequences of prior action

Examples:

- failing clean containment may create a follow-on district incident
- a rescued witness may open a related lead
- a public failure may shift the next week toward legitimacy-sensitive incidents

This is important for campaign continuity.

### 4.4 Global pressure

Generation should react to:

- case backlog
- support strain
- overload
- legitimacy pressure
- rival pressure
- funding/resource stress where appropriate

This helps ensure the player feels institutional consequences reflected in future intake.

### 4.5 Knowledge state

Generation itself should use world truth, but surfacing should respect player knowledge.

That means:

- the world may “know” a structured cause
- the player may only see a rumor, distorted intake, or partial signal
- knowledge and rumor systems control how cleanly the incident appears

This preserves partial-information gameplay.

---

## 5. Incident types

Incident generation should support several broad incident classes.

### 5.1 Direct operational incidents

Clear problems needing a routed response.

Examples:

- sealed site anomaly
- missing personnel
- containment failure
- public disturbance with hidden cause

### 5.2 Escalation follow-up incidents

Generated from prior unresolved or partial outcomes.

Examples:

- district visibility spike
- secondary anomaly spread
- retaliatory faction disruption

### 5.3 Contract-style incidents

Operational opportunities formalized through external requests.

Examples:

- authority request
- faction job
- private contract
- brokered intervention

### 5.4 Hub-spill incidents

Incidents emerging from hub state, rumor flow, district strain, or local opportunity networks.

### 5.5 Pressure-expression incidents

Problems generated primarily to reflect campaign strain.

Examples:

- legitimacy-sensitive unrest
- strained civic response
- institutional backlash
- blocked access event

---

## 6. Incident generation rules

Good incident generation rules should be:

- explicit
- bounded
- deterministic
- inspectable
- easy to tune

## Example rule patterns

### Rule pattern A — unresolved pressure

If unresolved urban anomaly pressure exceeds threshold, generate one additional district anomaly incident.

### Rule pattern B — failed follow-up

If prior mission failed and visibility rose, increase likelihood of legitimacy-sensitive incident next week.

### Rule pattern C — faction-driven

If faction presence is high in a hub district, surface one faction-linked operational opportunity or tension incident.

### Rule pattern D — local packet expression

If district packet includes infrastructure strain and social filtering, bias toward service-failure rumors and low-visibility incidents.

---

## 7. Determinism rules

Incident generation must remain deterministic.

That means:

- same input campaign state -> same generated incident set
- no hidden random-only branching as the primary decision source
- weighted or priority systems must still resolve deterministically from state

Possible deterministic methods:

- threshold tables
- ordered priority pools
- fixed tie-break rules
- seeded stable selection if needed, but still reproducible from state

---

## 8. Quantity and pacing

Incident generation should produce enough work to create pressure, but not so much that routing becomes noise.

Preferred weekly pattern:

- a bounded number of meaningful intake items
- some direct, some uncertain
- enough concurrency to force tradeoffs
- enough pacing variation to avoid monotony

Too few incidents:

- weak triage
- low institutional tension

Too many incidents:

- noisy list churn
- weak decision quality
- reduced consequence clarity

---

## 9. Incident quality rules

Every generated incident should be:

- operationally meaningful
- systemically supported
- clearly distinguishable enough from current queue
- mappable to tags/conditions/response lanes
- capable of escalating or resolving in a bounded way

Do not generate:

- incidents that only exist as flavor
- incidents with no plausible routing path
- incidents too broad to be resolved through the game’s systems
- incidents that imply unsupported mechanics

---

## 10. Surfacing paths

An incident can enter player awareness through different paths.

- Direct intake: Appears immediately in operations as a routable incident.
- Contract path: Appears as a structured offer with reward/obligation framing.
- Rumor path: Appears as partial information that may become a lead or mission later.
- Lead path: Appears as a stronger, more actionable clue that can be converted into response.
- Hub-linked path: Appears through district, service-node, or faction-presence surfacing.

This helps the game vary how work enters the player’s attention.

---

## 11. Incident lifecycle

A typical lifecycle:

Generated
-> surfaced
-> triaged
-> routed or deferred
-> mission response or neglect
-> resolved / partial / failed / escalated
-> feeds future generation

This lifecycle is central to campaign continuity.

---

## 12. Relationship to other systems

- Mission routing: Generated incidents are primary inputs into mission creation/assignment.
- Hub simulation: Hub state may shape how incidents surface, especially through rumors and opportunities.
- Factions: Faction state influences incident source, framing, and consequences.
- Legitimacy: Visibility and public pressure can shape what kinds of incidents become likely.
- Support and capacity: Overloaded institutions may still receive incidents, but their ability to answer them changes.
- Knowledge/intel: The same world-state problem may surface differently depending on what the player knows.

---

## 13. Tuning levers

Incident generation should expose bounded tuning levers such as:

- max incidents per week
- direct vs rumor vs contract surfacing ratio
- escalation carryover intensity
- faction influence weight
- legitimacy-sensitive generation weight
- district packet influence
- follow-up incident probability/priority
- unresolved-case pressure multiplier

Keep these explicit and centralized where possible.

---

## 14. Example generation flow

Current week starts
-> read unresolved incidents
-> read district pressure and faction presence
-> read prior mission outcomes
-> build candidate pools
-> apply deterministic generation rules
-> select bounded incident set
-> assign severity/escalation/visibility
-> surface as intake, contract, rumor, or lead

---

## 15. Example generated incident set

Example weekly outcome:

1 direct operational incident from unresolved infrastructure pressure

1 faction-linked contract from rising contact relationship

1 rumor tied to district instability after last week’s partial containment

1 legitimacy-sensitive public disturbance because civilian visibility rose

This feels alive because it is caused, not arbitrary.

---

## 16. QA / testing expectations

Incident generation tests should verify:

- Determinism: same state produces same incidents
- Pressure response: unresolved escalation changes next-week intake
- Faction influence: faction presence affects surfaced content
- Knowledge surfacing: signals can appear as rumor/lead instead of direct incident when appropriate
- Boundedness: generated volume stays within acceptable range
- Continuity: prior outcomes create plausible follow-on work

---

## 17. Common mistakes

- Mistake 1: Random-feeling output
  - If incidents appear disconnected from the campaign, the player stops trusting the simulation.
- Mistake 2: Flavor-only incidents
  - If an incident does not shape a decision, it should not take up intake space.
- Mistake 3: Overgeneration
  - Too many items turns triage into cleanup rather than strategy.
- Mistake 4: Repetitive generic incidents
  - The same vague structure repeated with different nouns reduces strategic texture.
- Mistake 5: Unsupported implication
  - Do not generate incidents implying mechanics that do not exist.

---

## 18. Summary

Incident generation in Containment Protocol should:

- create meaningful work
- reflect campaign state
- preserve deterministic causality
- support triage pressure
- route cleanly into missions and hub flows
- make the world feel reactive rather than random

The player should feel:

the world is producing problems because of what has happened, where we are, who is active, and what we failed or chose to handle last week.
