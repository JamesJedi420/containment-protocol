# Containment Protocol — Integration Test Plan

## Purpose

This document defines the integration-focused QA plan for Containment Protocol.

Integration testing verifies that the game’s major systems do not merely work in isolation, but correctly affect one another across the weekly campaign loop.

This plan exists to validate that:

- state changes propagate across system boundaries
- outputs from one system become valid inputs for the next
- player-facing surfaces reflect connected domain behavior
- campaign continuity is preserved through cross-system consequence
- no major system silently drifts into parallel truth or disconnected logic

This document is not the unit-test plan and not the determinism-only plan.

It is the QA plan for cross-system correctness.

This plan is for:

- QA validation
- regression coverage
- milestone integration review
- weekly loop verification
- system-boundary debugging

---

## Integration goals

Integration testing should:

- verify that major systems interact causally and correctly
- confirm that canonical state changes propagate through the campaign loop
- ensure surfaced outputs remain aligned with connected system behavior
- detect broken boundaries between domain systems
- catch regressions caused by safe-looking local changes
- support milestone confidence that the game behaves like one coherent machine

Integration testing should not:

- test each system as if it existed alone
- focus only on UI polish
- ignore report and hub output when validating systemic consequence
- stop at “the event fired” without checking downstream effect
- treat disconnected but technically valid state as acceptable

---

## 1. Core integration rule

The core rule is:

### Core integration rule

if one major system changes canonical state, all dependent systems must react correctly, consistently, and visibly

Examples:

- mission failure must affect pressure, recovery, or future opportunity where expected
- support shortage must change mission cleanliness and report notes
- legitimacy loss must shape future hub or access conditions
- unresolved escalation must change next-week intake

If propagation fails, the system integration is broken.

---

## 2. Main integration layers

Integration testing should cover these layers:

### Layer A — operational chain integration

- incident
- triage
- deployment
- mission resolution
- report output

### Layer B — institutional consequence integration

- mission outcomes
- support
- specialists
- recovery
- replacement pressure
- next-week readiness

### Layer C — world reactivity integration

- mission outcomes
- factions
- legitimacy
- hub simulation
- incident generation

### Layer D — continuity integration

- events
- reports
- persistence
- reload
- next-week state reuse

Each layer should be tested with bounded but realistic campaign fixtures.

---

## 3. Major integration paths

### 3.1 Incident -> triage -> deployment -> resolution

Validate that:

- surfaced incident data is routable
- triage state feeds deployment correctly
- deployment warnings reflect current readiness/support state
- mission resolution consumes the committed state correctly

### 3.2 Mission resolution -> report generation

Validate that:

- mission outcomes produce correct events
- report notes reflect actual causes
- key bottlenecks surface in priority order
- no contradictory report wording appears

### 3.3 Mission resolution -> support / recovery / team state

Validate that:

- injuries, damage, strain, and burden update correct owners
- recovery queues and backlog are created where expected
- support shortage affects post-mission state correctly
- team readiness changes persist into next week

### 3.4 Mission outcomes -> factions / legitimacy -> hub

Validate that:

- visible or faction-sensitive outcomes change posture correctly
- faction presence or opportunity quality shifts when expected
- legitimacy filtering changes what appears or how it appears in the Hub
- these effects are surfaced clearly

### 3.5 Unresolved pressure -> incident generation / escalation

Validate that:

- unresolved incidents affect future incident generation
- escalation increases future cost or urgency
- partial containment can create follow-on work
- district or social spillover appears when appropriate

### 3.6 Procurement / support / specialists -> deployment quality

Validate that:

- blocked items or throughput lanes affect readiness or cleanliness as intended
- repaired or acquired assets alter downstream capability correctly
- specialist bottlenecks constrain the correct recovery or mission lanes

### 3.7 Persistence -> next-week continuity

Validate that:

- saved state preserves all cross-system consequences
- reload does not erase latent bottlenecks, backlog, or filtering state
- continuing after reload produces the same integrated result as uninterrupted play

---

## 4. Integration fixture categories

### 4.1 Clean operational fixture

A stable agency resolves a manageable incident.

#### Use for — Clean operational fixture

- baseline propagation
- healthy path validation
- clean report generation

### 4.2 Support-strained fixture

A viable mission runs under support shortage.

#### Use for — Support-strained fixture

- follow-through degradation propagation
- support -> mission -> report integration
- support -> next-week carryover integration

### 4.3 Recovery-heavy fixture

A mission produces injuries and damaged assets while specialist capacity is tight.

#### Use for — Recovery-heavy fixture

- mission -> recovery -> backlog -> next-week readiness integration
- specialist bottleneck propagation
- Agency and Procurement surface checks

### 4.4 Visibility / legitimacy fixture

A visible partial or failure affects legitimacy-sensitive conditions.

#### Use for — Visibility / legitimacy fixture

- mission -> legitimacy -> hub/access integration
- report explanation correctness
- filtered opportunity generation

### 4.5 Faction-reactive fixture

A faction-linked contract or visible mission changes faction posture.

#### Use for — Faction-reactive fixture

- faction relationship propagation
- faction presence in hub
- contract/opportunity quality shifts

### 4.6 Escalation chain fixture

One or more unresolved incidents roll into the next week.

#### Use for — Escalation chain fixture

- escalation progression
- follow-on incident generation
- pressure carryover validation

---

## 5. System-to-system integration checks

### 5.1 Incident generation <-> hub simulation

Validate that:

- rumors, leads, or contracts can emerge from the same underlying world pressures
- district or faction conditions shape both systems consistently
- no duplicate or contradictory surfaced work appears without cause

### 5.2 Hub simulation <-> mission triage

Validate that:

- converted leads or contracts enter triage correctly
- item type, urgency, and uncertainty remain coherent
- Hub and Triage are not silently using conflicting state

### 5.3 Team management <-> deployment

Validate that:

- team readiness and role coverage flow into deployment checks
- recovering or unavailable teams cannot be treated as viable
- team degradation is visible in routing and deployment surfaces

### 5.4 Support operations <-> mission resolution

Validate that:

- support shortage changes follow-through when the mission is support-sensitive
- support sufficiency permits cleaner outcomes
- report output names support as cause when appropriate

### 5.5 Specialist capacity <-> recovery / procurement

Validate that:

- specialist lanes bottleneck correct work
- repair and recovery queues respect throughput
- backlog remains visible in next-week planning surfaces

### 5.6 Pressure mechanics <-> all major systems

Validate that:

- pressure changes mission quality, opportunity conditions, or future intake when intended
- pressure relief reduces those burdens correctly
- pressure is surfaced consistently across views

### 5.7 Reports <-> domain events <-> views

Validate that:

- report notes reflect domain events
- Agency/Triage/Hub views reflect the same underlying consequences
- no surface presents a conflicting story

---

## 6. Cross-surface validation

Because Containment Protocol depends on legibility, integration tests should verify cross-surface consistency.

For the same fixture, compare:

- Agency view
- Mission Triage
- Deployment flow
- Hub view
- Procurement and Support view
- Operations Report

These surfaces should agree on:

- what is bottlenecked
- what is degraded
- what changed this week
- what matters next

A system is not integrated if two views tell different truths about the same state.

---

## 7. Example integration scenarios

### Scenario A — support shortage propagation

Fixture:

- support available is below demand
- a support-sensitive mission is deployed

Expected chain:

- deployment warns about support risk
- mission resolves with degraded follow-through
- support shortage event emits
- report note mentions support shortage
- next-week Agency view still shows relevant carryover strain if applicable

### Scenario B — visible partial affects legitimacy and Hub

Fixture:

- a mission resolves partial with visible fallout

Expected chain:

- legitimacy decreases
- district visibility rises
- report surfaces legitimacy/visibility consequence
- next-week Hub output is more filtered or constrained
- Agency or Triage surfaces reduced clean-response room where relevant

### Scenario C — recovery bottleneck affects next-week readiness

Fixture:

- mission creates equipment damage and operative recovery
- maintenance throughput is insufficient

Expected chain:

- recovery backlog created
- specialist bottleneck event emitted
- report note names maintenance bottleneck
- Procurement/Support view shows repair carryover
- Agency view shows reduced next-week readiness or recovery burden

### Scenario D — unresolved escalation creates new work

Fixture:

- one high-risk incident is deferred

Expected chain:

- escalation increases
- next-week incident generation reflects worsening pressure
- Triage shows harsher urgency or new related work
- report and/or Hub preserve continuity of cause

### Scenario E — faction-backed contract changes future opportunity quality

Fixture:

- faction-linked work is completed cleanly

Expected chain:

- faction relationship improves
- future contract or lead quality changes
- Hub view reflects improved faction-linked opportunity
- report note or related surfaced signal explains the shift

---

## 8. Common integration failures to watch for

### Failure type 1: event with no downstream consequence

An event is emitted, but no other system reacts.

### Failure type 2: consequence with no surfaced explanation

State changes correctly, but the player cannot understand why.

### Failure type 3: surfaced explanation with no state backing

A view implies a bottleneck or change that canonical state does not support.

### Failure type 4: persistence break in the middle of a chain

The first week behaves correctly, but after reload the next-week consequence disappears.

### Failure type 5: duplicate truth across systems

Two systems both appear to own the same gameplay-critical fact and drift apart.

These should be treated as structural defects, not minor presentation bugs.

---

## 9. Evidence expectations

Integration tests should use inspectable evidence such as:

- canonical state changes
- emitted events
- report notes
- surfaced warnings
- next-week incident or hub output
- saved and reloaded continuity

Do not accept “it looked right” if inspectable evidence exists and does not match.

---

## 10. Manual integration walkthroughs

Manual QA should run a small number of high-value full-loop walkthroughs.

Suggested walkthroughs:

- healthy week with clean success
- strained week with support shortage
- recovery-heavy week with backlog carryover
- visibility-sensitive failure week
- faction-sensitive success week
- save/load continuity walkthrough after a consequence-heavy week

These should be repeated after major tuning changes.

---

## 11. Regression focus areas

High-risk integration regression areas include:

- mission result -> report note mapping
- support shortage -> follow-through propagation
- recovery backlog -> next-week readiness
- legitimacy/faction change -> hub filtering
- unresolved incident -> future incident generation
- procurement or repair action -> deployment viability
- save/load preservation of latent pressure or filtering state

These areas should be protected with representative fixtures.

---

## 12. Pass / fail criteria

An integration test generally passes when:

- the initiating system changes canonical state correctly
- dependent systems react correctly
- surfaced output explains the resulting state
- no contradictory surface or owner appears
- save/load does not break the consequence chain if included in scope

An integration test generally fails when:

- propagation stops early
- propagation affects the wrong owner
- UI/view output contradicts domain state
- later systems use stale or mirrored truth
- continuity breaks across weeks or reload

---

## 13. Acceptance criteria

The integration test plan is working when:

- major system boundaries are exercised by realistic fixtures
- consequence chains are validated end to end
- cross-surface consistency is checked explicitly
- persistence-sensitive propagation is covered
- regressions in connected behavior are easy to isolate
- milestone review can rely on this plan to validate “one coherent game,” not isolated features

---

## 14. Summary

The Containment Protocol integration test plan should verify that the game’s systems form a deterministic, institution-driven campaign loop rather than a loose collection of features.

It should ensure that:

- consequences propagate
- bottlenecks become visible in the right places
- world and agency state react coherently
- reports and views explain the same truth
- saved campaigns preserve the same connected consequences

The core QA question is:

when one part of the machine changes, does the rest of the machine react correctly, visibly, and persistently?
