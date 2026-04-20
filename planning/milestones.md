# Containment Protocol — Milestones

## Purpose

This document defines the milestone structure for Containment Protocol.

Milestones are not just date buckets. They are bounded proof points that show the game is becoming more itself in a controlled, testable way.

This document exists to answer:

- what each major development milestone is trying to prove
- what systems must be real at each stage
- what quality bar each milestone must meet
- what should not be considered “done enough” for milestone closure
- how to keep milestone scope aligned to dependency order

This document is for:

- planning
- milestone review
- issue grouping
- implementation focus
- scope discipline

---

## Milestone goals

Milestones should:

- represent meaningful increases in playable capability
- prove real system integration, not just visible progress
- stay bounded enough to complete
- reflect dependency order
- support honest issue closure and QA signoff
- move the project toward a trustworthy MVP and beyond

Milestones should not:

- become generic collections of unrelated work
- close based on partial demo paths
- prioritize breadth over core loop proof
- allow placeholder logic to count as delivery
- imply progress that the current playable game does not support

---

## 1. Milestone philosophy

Each milestone should answer a concrete question about the game.

Good milestone questions include:

- can the weekly loop run end to end?
- does the institution now matter across weeks?
- can the player understand why outcomes happened?
- does the world now react in bounded, meaningful ways?

Bad milestone framing includes:

- “more systems”
- “more polish”
- “more content”
- “Phase 2 stuff”

Milestones should be structured around proof, not volume.

---

## 2. Recommended milestone sequence

Recommended milestone order:

1. Simulation foundation
2. Weekly loop playable
3. Institutional consequences online
4. Legibility and planning trust
5. World reactivity online
6. MVP proof complete
7. Strategic breadth and hardening

These align with the roadmap’s dependency order.

---

## 3. Milestone 1 — Simulation foundation

### 3.1 Milestone question

Do we have a trustworthy canonical state and processing foundation to build the game on?

### 3.2 Required outcomes

- game state ownership is defined and implemented in usable form
- event schema and persistence model are coherent
- weekly state transition structure exists
- core entities are modeled consistently
- deterministic processing foundation is viable

### 3.3 Typical included work

- game state schema
- entity relationship model
- event schema
- persistence model
- basic save/load shape
- initial simulation scaffolding

### 3.4 Not enough to close

- docs only with no implementation anchor
- partial ownership with unresolved duplicated state
- persistence shape that cannot support next-step development safely

### 3.5 Closure standard

This milestone closes when downstream core-loop systems can be built on a trustworthy foundation without inventing new ownership rules ad hoc.

---

## 4. Milestone 2 — Weekly loop playable

### 4.1 Milestone question

Can a player complete the main weekly loop and feel real triage, deployment, outcome, and next-week consequence?

### 4.2 Required outcomes

- incidents can be generated or surfaced
- actionable work can be triaged
- a team can be assigned and deployed
- missions resolve deterministically
- a weekly report or summary exists
- next-week state changes based on the prior week

### 4.3 Typical included work

- incident generation
- mission triage
- deployment flow
- mission resolution
- basic team states
- initial Agency / Triage / Report views

### 4.4 Not enough to close

- isolated mission resolution without weekly continuity
- triage UI without meaningful consequence
- reports that restate outcomes without causal connection
- no persistent next-week change

### 4.5 Closure standard

This milestone closes when the game can be played through multiple weeks and the core campaign loop is recognizably real.

---

## 5. Milestone 3 — Institutional consequences online

### 5.1 Milestone question

Does the agency now behave like a constrained institution rather than a mission launcher?

### 5.2 Required outcomes

- support operations affect outcomes
- specialist bottlenecks can appear
- recovery and backlog persist across weeks
- readiness degradation matters
- pressure and overload create visible institutional cost
- replacement or recovery pressure exists in bounded form

### 5.3 Typical included work

- support operations
- specialist throughput
- recovery and attrition
- pressure mechanics
- readiness carryover
- Procurement and Support integration

### 5.4 Not enough to close

- support tracked but not affecting real outcomes
- recovery shown but not constraining future play
- pressure flags with no meaningful propagation
- institutional bottlenecks invisible to the player

### 5.5 Closure standard

This milestone closes when the player can clearly feel that the institution itself is now part of the challenge.

---

## 6. Milestone 4 — Legibility and planning trust

### 6.1 Milestone question

Can the player now understand what happened, why it happened, and what matters next?

### 6.2 Required outcomes

- reports surface meaningful causal notes
- key warnings are visible before deployment
- Agency, Triage, Deployment, and Report views agree on core state
- bottlenecks are prioritized clearly
- major thresholds are surfaced legibly
- determinism and integration QA coverage are usable

### 6.3 Typical included work

- Operations Report refinement
- Agency view refinement
- deployment warning quality
- cross-surface consistency work
- QA plans and fixtures
- report note prioritization

### 6.4 Not enough to close

- correct simulation with poor explanation
- contradictory view surfaces
- report noise overwhelming useful signal
- player forced to infer important causes from hidden logic

### 6.5 Closure standard

This milestone closes when the player can learn from outcomes instead of merely observing them.

---

## 7. Milestone 5 — World reactivity online

### 7.1 Milestone question

Does the world now respond through bounded social, faction, and opportunity systems that strengthen the main loop?

### 7.2 Required outcomes

- Hub view exists in meaningful form
- rumors, leads, and contracts surface from state
- faction presence affects opportunity quality or filtering
- legitimacy affects access, visibility cost, or opportunity shape
- prior outcomes influence future world-facing signals

### 7.3 Typical included work

- hub simulation
- rumor / lead / contract surfacing
- factions and legitimacy
- basic district or place-bound behavior
- world-facing filtered information

### 7.4 Not enough to close

- cosmetic faction labels with no gameplay effect
- rumor clutter without strategic signal
- Hub view that duplicates triage instead of adding mediated opportunity
- legitimacy number with no visible consequence

### 7.5 Closure standard

This milestone closes when the game world is reacting in a bounded, strategically meaningful way that the player can interpret and use.

---

## 8. Milestone 6 — MVP proof complete

### 8.1 Milestone question

Does the game now prove the core promise of Containment Protocol at MVP scale?

### 8.2 Required outcomes

- the full MVP loop is stable and playable
- triage, deployment, resolution, and reports all work together
- institutional bottlenecks and carryover matter
- world-facing opportunity variation exists in bounded form
- persistence and determinism are trustworthy enough for repeated campaign testing
- testers can articulate the game’s real identity from play

### 8.3 Typical included work

- MVP scope hardening
- cross-system bug cleanup
- threshold tuning pass
- pressure and fallout tuning pass
- persistence and reload validation
- representative campaign fixture testing

### 8.4 Not enough to close

- “most systems exist” without trustworthy play
- good demo slices with weak campaign continuity
- heavy placeholder tuning
- feature-complete surfaces without feature-complete consequence logic

### 8.5 Closure standard

This milestone closes when the MVP is not just assembled, but genuinely proves the game.

---

## 9. Milestone 7 — Strategic breadth and hardening

### 9.1 Milestone question

Can the game now support broader replayability, stronger campaign differentiation, and deeper validation without losing clarity?

### 9.2 Required outcomes

- more varied incidents and opportunity chains
- stronger strategic differentiation between runs
- improved balancing
- stronger QA regression confidence
- content breadth scaled on top of trustworthy systems
- harder edge-case and persistence resilience

### 9.3 Typical included work

- broader content packets
- richer incident/fallout variation
- balancing and progression refinement
- regression hardening
- larger fixture coverage
- broader campaign pacing validation

### 9.4 Not enough to close

- more content on unstable foundations
- richer breadth with weaker clarity
- “later game” additions that make the core loop less legible

### 9.5 Closure standard

This milestone closes when the game gains breadth without losing systemic trust.

---

## 10. Milestone dependency rules

The following dependency rules should hold:

### 10.1 Rule 1

Do not close a later milestone if a core dependency from an earlier milestone remains materially fake.

### 10.2 Rule 2

Do not count documentation-only proof as implementation proof.

### 10.3 Rule 3

Do not close a milestone on UI completion if core propagation is missing.

### 10.4 Rule 4

Do not skip legibility and trust work in order to widen feature breadth.

### 10.5 Rule 5

If a milestone’s proof question still has an unclear answer from actual play, the milestone is not done.

---

## 11. How to group issues under milestones

A milestone should group issues that all help answer its proof question.

Good grouping:

- all issues needed to make support shortages real and visible
- all issues needed to make weekly reports causal and useful
- all issues needed to make faction/legitimacy change opportunity quality

Bad grouping:

- unrelated “nice to have” UX cleanup
- broad thematic bundles with no shared proof target
- speculative future work that bypasses missing core dependencies

Milestones should feel like integrated slices, not containers.

---

## 12. Milestone review checklist

Before closing a milestone, confirm:

1. Has the milestone’s proof question been answered by actual playable behavior?
2. Are the required systems implemented, not implied?
3. Are connected consequences propagated correctly?
4. Are the major player-facing surfaces truthful and useful?
5. Is the QA evidence strong enough to trust the claim?
6. Would closing this milestone mislead future planning?

If 1, 3, 4, or 6 is weak, the milestone should remain open.

---

## 13. Common milestone closure mistakes

### 13.1 Mistake 1: Closing on visible breadth

Lots of screens or content does not equal milestone proof.

### 13.2 Mistake 2: Closing on one happy path

A demo is not a validated milestone.

### 13.3 Mistake 3: Closing when parent issues are only partially satisfied

Partial implementation should close child issues or get progress comments, not mark the milestone done.

### 13.4 Mistake 4: Closing before player-facing legibility exists

If the player cannot understand the new system, the milestone’s proof is weaker than it looks.

### 13.5 Mistake 5: Using milestone closure to force momentum

False closure creates planning debt and weakens source-of-truth trust.

---

## 14. Suggested current milestone framing

Given the current document and dependency structure, practical milestone framing should likely emphasize:

- finishing the core UX and systems spec chain
- validating the weekly loop and institutional consequence path
- proving the MVP loop before widening planning
- using QA and tuning docs to tighten implementation sequencing

This keeps milestone work aligned with the current actual dependency order.

---

## 15. Acceptance criteria

This milestone plan is effective when:

- milestone scope is easier to judge
- issue grouping becomes more coherent
- milestone closure is more honest
- roadmap phases become actionable
- the team can tell whether a milestone is truly proven or only partially assembled
- future planning has stronger trust in completed work

---

## 16. Summary

Milestones in Containment Protocol should represent proof of increasingly real layers of the game:

- simulation foundation
- playable weekly loop
- institutional consequence
- player legibility
- world reactivity
- MVP proof
- broader strategic depth and hardening

They should close only when playable behavior, propagation, and surfaced explanation all support the claim.

The core milestone question is:

what has the game now genuinely proven about itself that it could not prove before?
