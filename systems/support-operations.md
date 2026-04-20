# Containment Protocol — Support Operations Spec

## Purpose

This document defines the support operations system for Containment Protocol.

Support operations represent the agency’s non-field institutional layer:

- support capacity
- support recovery
- support shortages
- support bottlenecks
- agency-side throughput effects
- specialist-linked downstream constraints
- follow-through quality impacts

This system exists to make the institution itself matter, not just field teams.

Support should shape:

- what the agency can sustain
- how cleanly operations resolve
- how quickly burdens are absorbed
- how bottlenecks appear between field success and institutional stability

This spec is for:

- system design
- implementation planning
- tuning
- report surfacing
- UI integration
- testing

---

## Design goals

Support operations should:

- create a bounded non-field capacity layer
- distinguish agency-side support from deployable operatives
- affect real downstream outcomes
- remain deterministic and explainable
- surface shortages and bottlenecks clearly
- connect to recovery, follow-through, and specialist throughput
- stay institution-level rather than person-by-person

Support operations should not:

- become a second character-management game
- require individual scheduling of support staff
- explode into many overlapping subresources too early
- duplicate mission-team logic
- become invisible math the player cannot read

---

## 1. What support is

Support is the agency’s non-field operational infrastructure.

It represents the institutional capacity needed to:

- sustain clean mission follow-through
- process recovery burden
- move information and logistics cleanly
- absorb operational demand
- support throughput across weeks

Support is not:

- a squad
- a direct tactical unit
- a broad personnel roster sim
- generic flavor text about back-office people

Support should feel like:

- institutional throughput
- bounded administrative/logistical capacity
- the hidden machine behind field success

### Current bounded split in the repo

The current implementation uses two related but distinct support lanes:

- `agency.supportAvailable` remains the agency-side weekly follow-through pool
- `GameState.supplyNetwork` is the explicit connected-source field support
  substrate

That means a case can still be penalized because:

- the agency does not have enough weekly staff-side throughput
- or the field support path is broken by node control, blocked links, or
  disrupted transport

UI and report surfaces should not merge these into one opaque value. They
should surface the canonical cause that actually failed.

---

## 2. Support operations philosophy

Containment Protocol is an institution-first game.

That means field outcomes should not depend only on:

- team quality
- mission-specific conditions
- gear
- recon

They should also depend on whether the agency can sustain clean follow-through.

Preferred pattern:

```text
Mission commitment
+ support demand
+ recovery demand
+ specialist bottlenecks
= institutional load

If institutional load exceeds support capacity,
follow-through degrades and downstream burdens increase.
```

This creates a real difference between:

- winning a mission
- and winning it cleanly enough for the institution to remain stable

---

## 3. Core support loop

Agency has bounded support capacity
-> weekly operations consume that capacity
-> shortage or overload degrades follow-through / throughput
-> report notes explain the bottleneck
-> hub/campaign recovery restores or improves support
-> next week begins with updated support state

This is the main support loop and should remain visible and bounded.

---

## 4. Support system responsibilities

Support operations should be responsible for:

- institutional support availability
- support shortage / overload state
- support recovery / restoration path
- downstream mission follow-through effects
- support-facing surfaced explanation
- agency-side throughput bottlenecks

Support operations should not own:

- mission routing itself
- tactical combat detail
- faction reliability logic
- broad command hierarchy simulation
- every specialist behavior

---

## 5. Core support entities

### 5.1 Support capacity

#### Description — Support capacity

The bounded amount of institutional follow-through the agency can sustain this week.

Example canonical field:

agency.supportAvailable

#### Purpose — Support capacity

Acts as the main agency-side throughput resource.

#### Good first-pass behavior — Support capacity

- missions or recovery tasks consume support
- shortages degrade clean results
- restoration paths replenish support

### 5.2 Support shortage

#### Description — Support shortage

A state where weekly support demand exceeds available support capacity.

#### Purpose — Support shortage

Creates visible institutional strain.

#### Typical effects — Support shortage

- degraded mission follow-through
- reduced clean extraction or stabilization
- increased fallout
- weaker recovery throughput

### 5.3 Support recovery / restoration

#### Description — Support recovery / restoration

A bounded path that restores support capacity over time or through campaign/hub action.

#### Purpose — Support recovery / restoration

Prevents support pressure from becoming a one-way death spiral.

#### Typical sources — Support recovery / restoration

- weekly reset mechanics
- recovery actions
- facility effects
- bounded hub/campaign interventions

### 5.4 Support bottleneck signals

#### Description — Support bottleneck signals

Structured surfaced outputs that explain where support is limiting results.

#### Examples — Support bottleneck signals

- support shortage degraded clean follow-through
- support capacity cleared all current operational demand
- support overload likely next week
- recovery demand exceeded support throughput

---

## 6. What support affects

Support should affect at least one real downstream system.

Preferred impact lanes:

### 6.1 Mission follow-through

Support determines whether a mission resolves cleanly or in degraded form.

### 6.2 Recovery throughput

Support affects how quickly personnel, gear, or outcomes are stabilized after missions.

### 6.3 Specialist-enabled throughput

Support may combine with specialist lanes to shape institutional output.

### 6.4 Report and projection clarity

Support state must be surfaced to the player in understandable terms.

The system is strongest when support affects real outcomes, not just abstract numbers.

---

## 7. Support pressure and overload

Support pressure occurs when:

- too many operations happen at once
- too many follow-through demands stack together
- recovery burden exceeds institutional handling capacity
- specialist throughput is blocked and spills back into support strain
- later coordination friction amplifies overload under concurrent load

Support pressure should remain:

- deterministic
- bounded
- visible

Do not hide support problems behind vague “efficiency loss.”

---

## 8. Support recovery and persistence

Support operations should persist across weeks.

A good support system distinguishes between:

- current support available
- support consumed this week
- support restored or improved next week
- support shortage that created persistent fallout

This makes support part of campaign continuity.

---

## 9. Support specialist relationship

Support specialists are related to but distinct from generic support capacity.

### Generic support

Answers:

- can the agency sustain this level of operational load at all?

### Support specialists

Answer:

- can the agency perform this particular throughput or recovery lane cleanly?

Examples:

- support shortage degrades follow-through generally
- maintenance specialist shortage delays equipment recovery specifically

This separation is important.
Support should stay broad enough to matter institutionally.
Specialists should stay narrow enough to create meaningful bottlenecks.

---

## 10. Support state model

A conceptual support state may look like:

```ts
interface AgencyState {
  supportAvailable: number
  supportShortage?: boolean
  supportRecoveryPending?: boolean
}

interface SupportState {
  available: number
  shortageActive: boolean
  restoredThisWeek?: boolean
  overloadRisk?: boolean
}
```

Use only one canonical owner.
Do not mirror support state into parallel structures without a migration plan.

---

## 11. Support triggers

Support demand should come from real work.

Examples:

- active operations
- mission follow-through demands
- post-mission stabilization
- recovery queue burden
- support-sensitive opportunity paths

Support shortage should trigger only when:

demand > capacity

Keep this deterministic and inspectable.

---

## 12. Support consequences

When support is insufficient, consequences should be bounded and specific.

Good support consequences:

- clean success becomes degraded success
- partial becomes harsher partial
- recovery lags into next week
- additional fallout appears
- warnings appear before or after deployment

Bad support consequences:

- hidden all-stat penalty
- vague “things went worse”
- unrelated systems suddenly become weaker with no surfaced cause

---

## 13. Support surfacing rules

The player should always be able to see:

- current support availability
- whether support strain is active
- whether support affected a result
- whether support is likely to bottleneck next week

Support should surface in:

- agency summary
- operations warnings
- weekly reports
- projections
- bottleneck summaries

Examples of good surfaced text:

- Support shortage degraded clean follow-through.
- Support capacity cleared all current demand.
- Support overload is likely under concurrent deployment.
- Recovery demand still exceeds support capacity.

---

## 14. Support interactions with other systems

- Team management: Strong teams may still suffer degraded follow-through if support is weak.
- Mission resolution: Support is one of the agency-side inputs shaping clean vs degraded operational outcomes.
- Recovery: Support affects whether burdens are absorbed cleanly.
- Specialist systems: Support and specialist bottlenecks should interact without collapsing into one another.
- Coordination friction: Future coordination friction can grow out of support strain and concurrent load.
- Reports: Support outcomes should be surfaced through report notes and summaries.

---

## 15. Support tuning levers

Useful bounded tuning levers include:

- base support capacity
- support demand per mission
- support shortage penalty intensity
- support restoration rate
- support overload warning threshold
- number of concurrent operations safely handled
- support-to-recovery interaction intensity

Keep these explicit and centralized.

---

## 16. Non-goals

Support operations should not become:

- A support staff roster sim: No scheduling or per-person back-office assignment loops in the base model.
- A hidden efficiency layer: If the player cannot tell what support is doing, the system fails.
- A second field team system: Support remains agency-side, not tactical.
- A dumping ground for every institution mechanic: Keep support focused on throughput, follow-through, and bounded non-field capacity.

---

## 17. Common failure modes

- Failure mode 1: Support exists but affects nothing
  - If support has no real downstream consequence, it becomes decorative.
- Failure mode 2: Support is too opaque
  - If the player cannot see why support mattered, it feels unfair.
- Failure mode 3: Support is duplicated across multiple owners
  - This creates drift and testing problems.
- Failure mode 4: Support becomes too broad
  - If every institution mechanic is called “support,” the concept loses value.
- Failure mode 5: Support shortage always means total failure
  - Support should degrade quality and throughput, not necessarily destroy all action immediately.

---

## 18. Example support flow

Week begins with supportAvailable = 2

-> three support-sensitive demands appear
-> two resolve cleanly
-> one mission follow-through degrades due to shortage
-> report surfaces support shortage note
-> support restoration path returns some capacity next week

This is the desired pattern:
bounded, causal, visible.

---

## 19. Testing expectations

Support operations tests should verify:

- Core support loop: support is consumed by real weekly demand; shortage triggers when demand exceeds capacity; restoration path changes future state
- Outcome effects: shortage changes a real downstream mission or recovery result; sufficient support clears the same path cleanly
- Surfacing: reports and summaries explain support help or shortage
- Determinism: same state -> same support result
- Ownership: support state has one canonical owner; no parallel truth remains

---

## 20. Acceptance criteria

Support operations are working when:

- support exists as explicit institutional state
- support affects at least one real downstream path
- support shortage creates visible consequence
- the player can understand support impact through surfaced output
- recovery/restoration paths exist
- tests cover state change, shortage, recovery, and output

---

## 21. Summary

Support operations in Containment Protocol should make the non-field institution matter.

Support is the difference between:

- merely sending a team
- and having the organization capable of sustaining what that team starts

The player should feel:

the field team can attempt the job, but whether the agency can carry it through cleanly depends on the support machine behind them.
