# Containment Protocol — Team Management Spec

## Purpose

This document defines the team management system for Containment Protocol.

Team management is responsible for turning a pool of operatives into deployable field capability.

It includes:

- recruitment intake
- training and certification
- role coverage
- team composition
- cohesion
- readiness
- injuries, trauma, downtime, and recovery
- replacement pressure
- bounded assignment consequences across weeks

This system exists to make teams feel like institutional assets with real strengths, weaknesses, and continuity over time.

This spec is for:

- system design
- implementation planning
- tuning
- UI design
- testing
- content/systems integration

---

## Design goals

Team management should:

- make personnel condition matter
- reward disciplined team composition
- preserve bounded role identity
- reflect injuries, trauma, attrition, and recovery over time
- create meaningful deployment tradeoffs
- stay legible and deterministic
- avoid turning into a full character-life sim

Team management should not:

- become a broad personality simulator
- require constant micro-adjustment of every operative
- simulate every social interaction inside teams
- bury the player in roster administration
- reduce teams to interchangeable flat numbers

---

## 1. What a team is

A team is the primary deployable field unit.

A team is:

- composed of operatives
- shaped by role coverage and member condition
- affected by readiness and cohesion
- the main bridge between agency planning and mission resolution

A team is not:

- just a cosmetic label
- the same as the whole agency
- a fully separate tactics-layer army unit
- a broad social drama ensemble

---

## 2. Team management philosophy

Containment Protocol is institution-first.

That means team management should emphasize:

- capability
- readiness
- continuity
- bottlenecks
- role coverage
- recovery burden

The goal is not “build your favorite party.”
The goal is:

- maintain enough viable teams
- deploy the right capability to the right problem
- survive losses, downtime, and overload
- avoid breaking institutional capacity through poor assignments

---

## 3. Core team management loop

```text
Recruit candidates
-> train / certify operatives
-> assign operatives to teams
-> deploy teams on missions
-> resolve outcomes
-> apply trauma / injury / attrition / recovery
-> restore or rebuild team readiness
-> repeat next week
```

This loop should create persistent organizational texture.

---

## 4. Team management subsystems

### 4.1 Recruitment intake

#### Purpose — Recruitment intake

Provides new personnel entering the agency pipeline.

#### Expected behaviors — Recruitment intake

- candidates arrive through bounded funnels
- candidate quality or fit may vary
- intake capacity may constrain how quickly the agency expands
- recruitment exists to support replacement and growth, not infinite scaling

#### Outputs — Recruitment intake

- new candidates
- future operative pipeline
- replacement potential after losses

### 4.2 Training and certification

#### Purpose — Training and certification

Turns raw personnel into role-capable field operatives.

#### Expected behaviors — Training and certification

- operatives gain needed certifications or readiness through bounded training
- training capacity should matter
- insufficient training should create real deployment constraints

#### Outputs — Training and certification

- expanded team eligibility
- better role coverage
- cleaner mission readiness

#### Design rule — Training and certification

Training should change what the agency can do, not just add passive stat increase flavor.

### 4.3 Team composition

#### Purpose — Team composition

Defines how operatives are grouped into field teams.

#### Expected behaviors — Team composition

- teams should require meaningful role coverage
- composition should affect readiness and outcome quality
- certain missions should reward correct structure
- incorrect composition should create visible operational weakness

#### Good composition effects — Team composition

- missing role coverage worsens mission quality
- balanced teams preserve cleaner follow-through
- overusing the same key operatives increases institutional fragility

### 4.4 Cohesion

#### Purpose — Cohesion

Represents whether a team functions well together as a unit.

#### Expected behaviors — Cohesion

- cohesion influences operational reliability
- team changes, repeated losses, poor readiness, or overuse may degrade cohesion
- stable competent teams should feel more reliable

#### Design rule — Cohesion

Cohesion should be bounded and legible. It should not become a social-relationship sim.

### 4.5 Readiness

#### Purpose — Readiness

Represents a team’s current ability to deploy effectively.

#### Inputs may include — Readiness

- injuries
- trauma
- fatigue if used
- training/certification
- gear readiness
- support and recovery state
- unresolved recovery burdens

#### Outputs — Readiness

- deployment viability
- mission success/partial/failure quality
- player’s routing confidence

#### Design rule — Readiness

Readiness should be one of the main operational gate signals.

### 4.6 Recovery / downtime

#### Purpose — Recovery / downtime

Models the fact that teams cannot deploy at full capacity indefinitely.

#### Includes — Recovery / downtime

- operative recovery
- trauma burden
- team downtime
- equipment recovery interactions
- replacement pressure after loss

#### Outputs — Recovery / downtime

- reduced immediate deployment options
- delayed future strength
- long-horizon campaign friction

### 4.7 Attrition and replacement pressure

#### Purpose — Attrition and replacement pressure

Ensures loss and sustained damage matter to the institution over time.

#### Expected behaviors — Attrition and replacement pressure

- personnel loss should create real capability gaps
- replacement should take time/resources
- the agency should feel strain when relying on a thin bench

#### Design rule — Attrition and replacement pressure

Loss must persist, but not in a way that makes the campaign unrecoverable too quickly.

---

## 5. Canonical team-related entities

### Operative

Represents an individual field-capable person.

Expected state:

- role
- certifications
- readiness
- injury / trauma / recovery
- gear/loadout
- assignment status

### Team

Represents a deployable group.

Expected state:

- member list
- cohesion
- readiness
- deployment status
- assigned mission if any

### Candidate

Represents a recruit in intake, not yet a full operative.

---

## 6. Team management inputs

Team management should read:

- agency support state
- specialist bottlenecks where relevant
- training capacity
- recruitment intake
- facility upgrades
- equipment availability
- prior mission outcomes
- recovery burden
- attrition state

It should connect outward to:

- mission routing
- mission resolution
- support systems
- procurement
- reports
- hub/contract decisions indirectly through capacity

---

## 7. Team management outputs

Team management should produce:

- deployable team states
- bounded readiness/cohesion values
- visible capability gaps
- recovery burden
- future replacement/training demand
- player-facing warnings and bottlenecks

These outputs should be visible enough that the player can reason about:

- who can go
- who should not go
- what will break next if they force the issue

---

## 8. Mission-facing effects

Team management should meaningfully affect mission resolution through:

- Role coverage: Missing a required role should matter.
- Weakest-link effects: A single badly compromised critical operative may degrade overall mission performance.
- Cohesion: Poorly integrated or unstable teams should perform less cleanly under pressure.
- Readiness: Low readiness should increase likelihood of partial or degraded outcomes.
- Recovery burden: A heavily strained team should be visibly less attractive for immediate redeployment.

---

## 9. Bounded signals preferred

Team management should use bounded, explainable signals rather than hidden sprawling stats.

Preferred signals:

- readiness
- cohesion
- certification coverage
- deployment status
- recovery burden
- role gap
- replacement pressure

Avoid large invisible bundles of tiny modifiers.

---

## 10. Example team management flow

New week
-> check team readiness and recovery
-> inspect candidate funnel
-> train or certify personnel if possible
-> rebuild or adjust team composition
-> route missions based on available capability
-> deploy
-> mission resolves
-> update injuries, trauma, cohesion, and readiness
-> next week begins with altered team state

---

## 11. UI surfacing expectations

The player should be able to see:

- which teams are ready
- which teams are degraded
- which operatives are injured or recovering
- where role coverage is weak
- what certification gaps matter
- which teams are overused
- how losses are affecting next-week options

This should be visible from:

- agency overview
- operations deployment flow
- reports

The player should not need to infer core readiness from hidden internals.

---

## 12. Tuning levers

Team management should expose bounded tuning levers such as:

- recruitment intake frequency
- training/certification time
- cohesion penalty intensity
- readiness recovery speed
- injury / trauma persistence
- replacement delay
- role-gap severity
- weakest-link weighting in mission resolution

These should be explicit and centralized where possible.

---

## 13. Non-goals

This system should not become:

- A personality sim: Avoid broad interpersonal drama systems unless tightly bounded.
- A scheduling sim: Avoid shift-level micromanagement or roster administration sprawl.
- A life sim: Operatives matter because they affect capability, not because every detail of daily existence must be modeled.
- A roster spreadsheet game: The player should care about teams because of operational consequences, not because admin depth becomes the game itself.

---

## 14. Common failure modes to avoid

- Failure mode 1: Teams feel interchangeable
  - If composition and readiness do not matter, the system collapses into generic slot filling.
- Failure mode 2: Too much micromanagement
  - If every minor personnel change requires heavy UI work, the system becomes exhausting.
- Failure mode 3: Losses do not matter
  - If attrition has no persistent bite, campaign pressure weakens.
- Failure mode 4: Losses matter too much
  - If one bad week destroys the campaign beyond recovery, strategic play becomes brittle.
- Failure mode 5: Hidden weak points
  - If a team fails because of unseen role/cert gaps, the player will feel cheated rather than challenged.

---

## 15. Example conceptual state

```ts
interface OperativeState {
  id: string;
  role: string;
  certifications: string[];
  readiness: number;
  trauma: number;
  status: "available" | "deployed" | "recovering" | "lost";
}

interface TeamState {
  id: string;
  memberIds: string[];
  cohesion: number;
  readiness: number;
  deploymentStatus: "idle" | "assigned" | "deployed" | "recovering";
}
```

These are examples only; implementation may differ.

---

## 16. Testing expectations

Team management tests should verify:

- Recruitment / training: candidate intake works deterministically; training changes deployment capability meaningfully
- Composition: missing roles or certifications affect deployment or resolution correctly; team formation updates readiness/cohesion as intended
- Recovery: injuries and trauma persist and recover correctly; readiness does not snap back unrealistically
- Attrition: loss creates visible replacement pressure; future deployment options narrow when expected
- Legibility: surfaced warnings or summaries explain major capability gaps

---

## 17. Acceptance criteria

The team management system is working when:

- team composition matters
- readiness meaningfully affects operations
- recovery and attrition create persistent constraints
- the player can understand why one team is more viable than another
- losses and weak preparation change future routing decisions
- the system remains deterministic and bounded

---

## 18. Summary

Team management in Containment Protocol should make the player feel like they are maintaining a fragile operational instrument.

Teams should not just be names on a list. They should be:

- prepared or unprepared
- stable or strained
- cohesive or degraded
- capable or dangerously incomplete

The player should feel:

every deployment changes the institution, and every team is a resource that can be sharpened, spent, damaged, or lost.
