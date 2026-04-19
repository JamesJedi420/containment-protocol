# Containment Protocol — Support and Specialist Capacity Tuning Spec

## Purpose

This document defines the tuning approach for support and specialist capacity in Containment Protocol.

Support and specialist capacity determine how much institutional follow-through, recovery handling, and bounded agency-side throughput the organization can sustain each week.

This document tunes:

- base support capacity
- support shortage thresholds
- specialist lane throughput
- backlog tolerance
- restoration pace
- when shortages become visible
- when shortages become strategically dangerous

This document is not the core design spec for support operations or specialist systems.

It is the tuning reference for:

- how often support should bottleneck execution
- how scarce specialist capacity should feel
- how quickly backlogs should accumulate
- how quickly the player can recover from overload
- how support and specialist constraints should shape campaign tempo

This spec is for:

- systems tuning
- balancing
- implementation parameterization
- QA pacing review
- institutional load evaluation

---

## Design goals

Support and specialist capacity tuning should:

- make agency-side throughput matter
- create real cost for overcommitment
- keep support distinct from field-team strength
- make specialist scarcity visible and consequential
- support deterministic, explainable bottlenecks
- preserve recovery and stabilization as strategic work
- remain bounded and readable

Support and specialist capacity tuning should not:

- create constant unavoidable shortage every week
- make support so abundant that it stops mattering
- make specialist lanes so narrow that the campaign locks too easily
- turn every capacity issue into the same generic penalty
- hide the main institutional bottleneck from the player

---

## 1. What support capacity is

Support capacity is the bounded amount of general institutional follow-through the agency can sustain in a weekly step.

It governs things like:

- clean mission follow-through
- post-mission stabilization
- non-field throughput quality
- the agency’s ability to absorb concurrent operational burden

Support capacity answers:

- how much clean operational load can the institution sustain this week?
- when does concurrent commitment become too much?
- when does success become degraded because the back-end cannot carry it through?

---

## 2. What specialist capacity is

Specialist capacity is the bounded throughput of narrower institutional lanes required for specific kinds of work.

Examples may include:

- maintenance
- medical stabilization
- engineering
- doctrine or handling-sensitive work
- other bounded agency-side capability lanes

Specialist capacity answers:

- can the agency perform this particular institutional task cleanly?
- how many of these jobs can actually clear this week?
- what kind of backlog appears when this lane is saturated?

Support is broad institutional capacity.
Specialist capacity is narrower and more domain-specific.

---

## 3. Capacity tuning philosophy

Support and specialist tuning should create visible institutional limits without overwhelming the campaign.

Preferred pattern:

```text
Planned work and carryover burden

-> consume support and specialist throughput

-> if capacity holds, clean outcomes and recovery continue

-> if capacity strains, warnings appear

-> if capacity is exceeded, degraded follow-through and backlog appear

-> next week begins with altered institutional state
```

The player should often feel:

- we can handle this, but not everything
- this extra deployment is probably what tips support into strain
- the maintenance lane is the real bottleneck, not funding
- we need to stabilize before we expand again

## 4. Core tuning questions

This tuning should answer:

- How many meaningful commitments should the agency sustain before support strain appears?
- How often should specialist bottlenecks appear in normal play?
- How quickly should backlogs clear under stable play?
- How quickly should overload create carryover pain?
- How much should upgrades or good planning expand safe capacity?
- When should the player be able to recover from a strained week?

## 5. Support capacity bands

Support should usually be tuned in bands.

### 5.1 Clear capacity

#### Description — Clear capacity

Current demand is well within support limits.

#### Expected feel — Clear capacity

- clean follow-through likely
- warnings absent or minimal
- another modest commitment may still be safe

### 5.2 Near capacity

#### Description — Near capacity

The agency is close to its support ceiling.

#### Expected feel — Near capacity

- warnings begin
- one more meaningful support-sensitive commitment may cause degradation
- planning becomes tighter

### 5.3 Strained

#### Description — Strained

Support demand now exceeds or effectively exceeds safe capacity.

#### Expected feel — Strained

- degraded follow-through becomes likely
- partial institutional failure patterns begin
- next-week carryover risk rises

### 5.4 Overloaded

#### Description — Overloaded

The institution is clearly handling more than it can absorb cleanly.

#### Expected feel — Overloaded

- support shortage is obvious
- multiple actions compete for throughput
- degraded outcomes and carryover become common

#### Design rule — Overload

Overload should be dangerous, but not the unavoidable default state.

## 6. Specialist capacity bands

Specialist lanes should usually use similar, narrower bands.

### 6.1 Available

The lane can clear current work comfortably.

### 6.2 Tight

The lane can clear some work, but not all likely demand safely.

### 6.3 Bottlenecked

The lane is now the main reason work is delayed or degraded.

### 6.4 Choked

The lane is producing visible multi-week backlog and materially constraining play.

#### Design rule — Specialist lanes

Specialist lanes should bottleneck specific domains, not become generic pain everywhere.

## 7. Support demand tuning

Support demand should come from real institutional work.

Likely sources include:

- active mission follow-through
- post-mission stabilization
- recovery support burden
- concurrent operational handling
- support-sensitive opportunity paths

### Tuning rule — Support demand

Support demand should feel:

- light for small, disciplined weeks
- meaningful under concurrent commitments
- sharp when the player tries to stretch the institution too far

### Good pattern

One meaningful support-sensitive mission may be manageable.
Two may create warning-level strain.
Three concurrent burdens may trigger degraded follow-through.

## 8. Specialist demand tuning

Specialist demand should arise when specific systems require bounded expert throughput.

Examples:

- repair jobs require maintenance throughput
- recovery-heavy missions may require medical throughput
- asset-enabled missions may require engineering or handling throughput

### Tuning rule — Specialist demand

Specialist demand should be:

- sparse enough to stay legible
- common enough that the player learns to respect the lane
- clustered enough that backlog patterns become visible under strain

## 9. Shortage threshold tuning

Support and specialist shortage thresholds should usually trigger before full breakdown.

### Desired player experience — Shortage threshold

- first, warning
- then, visible degradation risk
- then, active consequence
- then, carryover or backlog

#### Design rule — Shortage threshold

The player should often have one decision window to respond before the bottleneck becomes a larger campaign problem.

## 10. Backlog tuning

Backlog is where support and specialist capacity become campaign memory.

Backlog may include:

- unrecovered equipment
- delayed repairs
- unresolved support-sensitive recovery burden
- queued specialist jobs
- delayed institutional handling

### Good backlog behavior

- one or two backlog items are manageable
- repeated or stacked backlog narrows future options
- clear capacity and good planning reduce backlog steadily
- overload produces multi-week drag

### Design rule — Backlog

Backlog should matter enough to shape planning, but not so much that one strained week becomes permanent paralysis.

## 11. Restoration and recovery tuning

Support and specialist systems need meaningful restoration paths.

Relief may come from:

- weekly reset or bounded recovery
- reduced concurrent demand
- facility upgrades
- deliberate stabilization weeks
- successful clean resolution reducing future handling burden

### Desired feel — Restoration

- one stable week should help
- several disciplined weeks should visibly restore institutional function
- restoration should be slower than reckless overload, but fast enough to feel strategic

## 12. Good support tuning patterns

### Pattern A — warning before degradation

Support shows “near capacity” before it begins degrading results.

### Pattern B — concurrency sensitivity

Support strain rises sharply when multiple support-sensitive burdens overlap.

### Pattern C — clean-week recovery

A lower-load week visibly restores room to operate.

### Pattern D — institutional drag

Support shortage often affects cleanliness and carryover rather than immediate total failure.

These preserve the institution-first identity of the game.

## 13. Good specialist tuning patterns

### Pattern A — domain-specific bottleneck

Maintenance delays repair, not every unrelated system.

### Pattern B — visible queue pressure

The player sees one or two delayed items and understands why.

### Pattern C — scarcity with relief path

The lane is constrained, but upgrades, lower demand, or time can fix it.

### Pattern D — strategic asymmetry

Some campaigns may be maintenance-tight, others recovery-tight, creating different institutional shapes.

## 14. Bad patterns to avoid

### Bad pattern 1: Permanent universal shortage

If support is almost always overloaded, the system stops teaching anything.

### Bad pattern 2: Decorative capacity

If support and specialist values rarely affect outcomes, they become dead UI.

### Bad pattern 3: Hidden throughput

If the player cannot tell what is consuming the lane, the system feels unfair.

### Bad pattern 4: Over-fragmented specialist lanes

Too many narrow capacities make the game unreadable.

### Bad pattern 5: Zero recovery slope

If overload creates backlog but backlog barely clears, the campaign becomes fatalistic.

## 15. Capacity scaling with campaign growth

Support and specialist capacity should scale more slowly than reckless expansion, but enough that good investment matters.

### Desired tuning feel — Capacity scaling

- early game: low but manageable capacity
- mid game: meaningful bottlenecks unless the player invests wisely
- later game: stronger institutional resilience if growth was disciplined
- mismanaged growth: still capable of overload despite better raw capacity

#### Design rule — Capacity scaling

Capacity growth should create room, not immunity.

## 16. Interaction with other systems

### Mission resolution

Support should heavily influence follow-through quality.
Specialists should influence domain-specific throughput or recovery quality.

### Recovery systems

Backlog and delayed recovery are major outputs of overloaded support/specialist lanes.

### Pressure mechanics

Support strain and specialist bottlenecks are both pressure lanes and pressure amplifiers.

### Team management

Capacity constraints should change whether the player can keep teams cleanly deployable.

### Procurement

Repair, replacement, and restoration often depend on specialist or support throughput, not only cost.

### Reports

These systems should generate some of the clearest causal notes in the campaign.

## 17. Example conceptual tuning targets

These are qualitative targets, not final numbers.

### Healthy week

The player can:

- deploy one meaningful mission cleanly
- absorb modest recovery burden
- avoid backlog growth if they stay disciplined

### Busy but manageable week

The player can:

- attempt multiple commitments
- see warning-level support strain
- likely carry one bounded burden forward

### Strained week

The player can:

- still act
- but must accept degraded follow-through or backlog growth
- and should likely stabilize next week

### Overloaded week

The player should feel:

- support shortage clearly
- specialist bottleneck visibly
- persistent carryover pressure next week

## 18. Surfacing requirements

Support and specialist tuning only works if the player can read the state.

The game should surface:

- current support availability
- current shortage or overload state
- current specialist bottleneck
- likely next-week carryover
- what demand is driving the bottleneck

**Good surfaced examples:**

- Support shortage degraded clean follow-through.
- Maintenance bottleneck delayed full equipment recovery.
- Concurrent routing is likely to exceed support capacity.
- Recovery demand remains above maintenance throughput.

## 19. QA and balancing review questions

Review and testing should ask:

- how many commitments can the player sustain before support warnings appear?
- are specialist bottlenecks visible often enough to matter?
- does backlog clear at a satisfying pace under disciplined play?
- do overloaded weeks leave meaningful but survivable scars?
- does support shortage usually degrade cleanliness rather than immediately nullify action?
- are specialist shortages specific enough to teach the player what the real lane is?

**Determinism testing should verify:**

- same weekly demand -> same support and specialist state change
- same backlog -> same throughput outcome
- same warnings and report notes from same capacity conditions

## 20. Acceptance criteria

Support and specialist capacity tuning is working when:

- support creates meaningful concurrency limits
- specialist bottlenecks appear in specific, understandable domains
- backlog and carryover matter to next-week planning
- restoration paths visibly improve future state
- the player can identify the main institutional bottleneck quickly
- overload is dangerous without being constant
- capacity growth helps without trivializing institutional strain

## 21. Summary

Support and specialist capacity tuning in Containment Protocol should determine how much institutional load the agency can actually carry each week.

It should:

- make non-field capacity matter
- create visible concurrency limits
- produce specific bottlenecks
- preserve backlog and carryover as campaign memory
- support recovery and stabilization as strategic play

The player should feel:

the real limit is not only whether a team can go — it is whether the institution behind that team can absorb what happens next.
