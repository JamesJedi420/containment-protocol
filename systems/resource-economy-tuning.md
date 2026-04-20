# Containment Protocol — Resource Economy Tuning Spec

## Purpose

This document defines the tuning approach for the resource economy in Containment Protocol.

The resource economy governs how the agency gains, spends, preserves, and strains its material and institutional resources across weeks.

It determines how the player feels:

- funding pressure
- procurement cost
- upkeep burden
- recovery expense
- replacement burden
- expansion cost
- scarcity-driven tradeoffs

This document is not the core design spec for economy ownership.

It is the tuning reference for:

- how generous or tight the campaign economy should be
- how quickly economic strain appears
- how strongly resource constraints shape planning
- how economy pressure should interact with support, recovery, and growth
- how scarcity should reinforce institutional tradeoffs without collapsing the game into a spreadsheet

This spec is for:

- systems tuning
- balancing
- implementation parameterization
- QA pacing review
- campaign economy evaluation

---

## Design goals

The resource economy should:

- create meaningful scarcity
- make prioritization and institutional discipline matter
- force tradeoffs between stability, recovery, and expansion
- support deterministic planning
- reinforce pressure without becoming the only pressure system
- make funding shortfall feel consequential but not immediately fatal
- remain bounded and legible

The resource economy should not:

- become a pure cash-optimization game
- flood the player with abundant resources that trivialize tradeoffs
- become so punitive that the player cannot recover from moderate mistakes
- rely on opaque hidden cost scaling
- collapse all strategic decisions into one money number

---

## 1. What the resource economy is

The resource economy is the bounded system that governs how the agency pays for sustained operation.

It includes:

- current funds
- upkeep
- procurement cost
- replacement cost
- recovery-related cost where applicable
- upgrade cost
- market or access friction where applicable

It shapes whether the player can:

- restore capability
- sustain current operations
- replace losses
- invest in future capacity
- accept opportunity cost cleanly

The resource economy is not:

- a broad market sim
- a trading minigame
- a loot treadmill
- an infinite growth curve

It is the resource discipline layer of the management loop.

---

## 2. Resource economy philosophy

The economy should create real strategic constraint without overpowering all other systems.

Preferred pattern:

```text
Funding available

-> upkeep and current burdens reduce flexibility

-> player chooses between stabilization, replacement, and growth

-> poor economic discipline narrows future options

-> successful planning restores room to maneuver
```

This means the player should often feel:

- I can do some of this, not all of it
- replacing losses has real cost
- growth competes with stability
- under strain, economic choices become sharper

## 3. Core economy questions

The economy tuning should answer:

- How often should the player feel resource tension?
- How expensive should clean recovery and replacement be?
- When should growth feel possible versus reckless?
- How much should one bad week affect next-week purchasing power?
- How much economic flexibility should good play create?
- How tightly should economy interact with support, recovery, and legitimacy?

## 4. Core resource economy loops

### 4.1 Stability loop

Funding

-> pay upkeep and recovery burden

-> maintain functional capability

-> preserve future flexibility

### 4.2 Replacement loop

Losses or damage

-> replacement cost or repair demand

-> reduced spending room elsewhere

-> future capability restored or delayed

### 4.3 Growth loop

Surplus or good planning

-> invest in upgrades or capacity

-> increased future resilience

-> greater ability to handle later pressure

### 4.4 Scarcity loop

Too many simultaneous burdens

-> funding shortfall

-> delayed replacement or growth

-> weaker future readiness

-> sharper next-week tradeoffs

These loops should be visible and strategically legible.

## 5. Desired campaign feel

The economy should usually feel:

### Early campaign

- constrained but manageable
- enough room for meaningful choice
- not enough room for careless expansion
- recoverable after modest mistakes

### Mid campaign

- increasingly stressed by parallel burdens
- more shaped by upkeep, repair, and replacement
- strongly influenced by prior operational quality
- less tolerant of waste

### Later campaign

- capable of supporting resilience if the player invested well
- still vulnerable to compounding losses and legitimacy/faction cost
- tight enough that mistakes remain meaningful
- not so punitive that recovery becomes impossible

## 6. Main economy pressures

### 6.1 Upkeep pressure

#### Function — Upkeep pressure

Creates baseline cost for existing institutional scale.

#### Good tuning outcome — Upkeep pressure

The player feels that expansion increases obligation, not just power.

#### Bad tuning outcome — Upkeep pressure

Upkeep is so low it can be ignored, or so high it permanently freezes growth.

### 6.2 Procurement pressure

#### Function — Procurement pressure

Creates cost for acquiring necessary gear or support inputs.

#### Good tuning outcome — Procurement pressure

The player must choose what to equip or restore first.

#### Bad tuning outcome — Procurement pressure

Everything important is always affordable, or basic operational readiness becomes impossible too often.

### 6.3 Replacement pressure

#### Function — Replacement pressure

Turns losses and damage into persistent economic consequence.

#### Good tuning outcome — Replacement pressure

Replacing capability is painful enough to matter.

#### Bad tuning outcome — Replacement pressure

Losses are either trivial to replace or financially campaign-ending too quickly.

### 6.4 Recovery pressure

#### Function — Recovery pressure

Economic burden combines with support/specialist burden to make damaged weeks matter.

#### Good tuning outcome — Recovery pressure

The player feels cost not only in money, but in delayed readiness and reduced flexibility.

#### Bad tuning outcome — Recovery pressure

Recovery is either purely free or purely impossible.

### 6.5 Upgrade pressure

#### Function — Upgrade pressure

Makes long-horizon growth compete with immediate stabilization.

#### Good tuning outcome — Upgrade pressure

Choosing growth feels strategic and risky.

#### Bad tuning outcome — Upgrade pressure

Upgrades are always obvious buys or never worth considering.

## 7. Economy bands

The resource economy should usually be felt in bands.

### 7.1 Comfortable

#### Description — Comfortable

The agency can cover current burdens and make some proactive choices.

#### Expected feel — Comfortable

- still constrained
- can invest selectively
- not under immediate funding stress

### 7.2 Tight

#### Description — Tight

The agency can cover essentials, but tradeoffs are now sharp.

#### Expected feel — Tight

- replacement, recovery, and upgrades now meaningfully compete
- mistakes have visible opportunity cost
- some lower-priority work will be deferred

### 7.3 Strained

#### Description — Strained

The agency cannot comfortably cover all current burdens.

#### Expected feel — Strained

- replacements are delayed
- growth choices feel risky
- current week burdens visibly reduce future room

### 7.4 Critical

#### Description — Critical

The economy is actively shaping what the agency is allowed to attempt.

#### Expected feel — Critical

- purchases are highly constrained
- recovery carries over
- long-term growth is effectively paused until stabilization occurs

#### Design rule — Critical

Critical economy pressure should be dangerous, but not immediately unwinnable by itself.

## 8. Funding inflow tuning

Funding inflow should be tuned to create pressure without eliminating agency.

Possible sources may include:

- contracts
- weekly baseline funding
- faction-backed work
- performance-linked rewards
- bounded strategic gains

### Tuning rule — Funding inflow

Funding inflow should generally:

- reward clean or disciplined play
- not fully erase scarcity
- support recovery after strong weeks
- still leave meaningful decisions unresolved

#### Bad patterns — Funding inflow

- one successful week creates indefinite abundance
- inflow is so low that even stable play collapses
- rewards are disconnected from campaign quality

## 9. Cost tuning principles

### Rule 1: Replacement should hurt more than routine upkeep

Loss must be felt as disruption.

### Rule 2: Clean prevention should often be cheaper than messy recovery

This encourages disciplined play.

### Rule 3: Upgrades should compete with stabilization

Growth must have opportunity cost.

### Rule 4: Routine readiness should be sustainable when the player is not overloaded

Basic operation cannot feel impossible by default.

### Rule 5: Repeated poor outcomes should create visible cost compounding

Economic pain should be part of campaign memory.

## 10. Economy interaction with other systems

### Support operations

Economic shortfall may block the material side of clean support, but should not replace support mechanics.

### Recovery

Economic strain should slow or narrow recovery options.

### Team management

Replacement and loadout constraints should affect team viability.

### Pressure mechanics

Resource stress should act as one pressure lane among several.

### Factions and legitimacy

Access, contract quality, and market friction may shift under these systems.

### Procurement

This is the main view where resource economy becomes immediately actionable.

## 11. Good tuning patterns

### Pattern A — bounded scarcity

The player can usually solve some of the week’s problems, but not all of them.

### Pattern B — preventive advantage

Avoiding damage and visible failure is economically better than constantly repairing after the fact.

### Pattern C — growth tension

Investing in capacity should feel smart only when current strain is under control.

### Pattern D — recoverable setbacks

A bad week should hurt the next few weeks, not automatically end the campaign.

### Pattern E — economic memory

Repeated instability should leave economic scars through repair, replacement, and opportunity loss.

## 12. Bad tuning patterns to avoid

### Bad pattern 1: Infinite float

If money rarely matters, economy ceases to be strategic.

### Bad pattern 2: One-mistake insolvency

If one damaged week hard-locks the campaign, the system is too brittle.

### Bad pattern 3: Upgrade dominance

If upgrades are always the best use of money, stabilization loses relevance.

### Bad pattern 4: Pure maintenance treadmill

If every week is only about paying upkeep, the economy becomes joyless.

### Bad pattern 5: Unreadable scarcity

If the player cannot tell what is expensive and why, decisions feel arbitrary.

## 13. Example economy tensions

Useful weekly tensions include:

- replace damaged gear or preserve funds for next-week support needs
- pay for clean recovery now or accept degraded readiness later
- invest in training capacity or maintain current operational stability
- take a faction-backed contract for funding despite future legitimacy or relationship cost
- defer a useful upgrade because replacement pressure is active

These are the kinds of choices the economy should force.

## 14. Tuning levers

The resource economy should expose bounded tuning levers such as:

- baseline weekly funding
- contract payout levels
- upkeep scaling
- replacement cost severity
- repair versus replace cost ratio
- upgrade cost scaling
- recovery cost pressure
- market/access price modifiers
- funding loss from visible failure or poor posture
- surplus smoothing or safety margin rules

These should be explicit and centrally adjustable.

## 15. Example conceptual targets

These are qualitative targets, not final numbers.

### Healthy week

The player can:

- maintain baseline readiness
- resolve one or two meaningful burdens
- still feel at least one resource tradeoff

### Strained week

The player can:

- cover essentials
- fix one major blocker
- likely defer something important

### Bad week aftermath

The player should feel:

- real replacement or recovery cost
- reduced flexibility next week
- possible stabilization route without hopeless lock

### Strong week aftermath

The player should feel:

- some breathing room
- possibility of proactive investment
- not permanent economic abundance

## 16. QA and balance review questions

Balancing review should ask:

- when does the player first feel money pressure?
- how often can the player afford both stabilization and growth?
- do losses create lasting but survivable economic consequences?
- is clean play rewarded materially?
- does procurement feel meaningful without dominating the campaign?
- does economy pressure reinforce, rather than replace, support and recovery pressure?

Testing should verify:

- same state produces same economic outcome
- core purchases meaningfully affect future viability
- economic scarcity remains present across normal play
- stabilization paths exist after poor weeks
- no single cost band creates unavoidable dead states too early

## 17. Acceptance criteria

Resource economy tuning is working when:

- the player regularly faces meaningful funding tradeoffs
- growth competes with stabilization
- losses and damage create visible resource consequence
- clean play improves economic flexibility
- poor play creates bounded but persistent economic strain
- the economy remains important without eclipsing every other system
- campaign recovery remains possible after moderate failure

## 18. Summary

The resource economy in Containment Protocol should create bounded scarcity that reinforces institutional planning, recovery discipline, and careful expansion.

It should:

- make money matter
- make losses expensive
- make growth strategic
- keep stability and expansion in tension
- support long-horizon consequence without becoming a pure finance game

The player should feel:

resources are never unlimited, and every repair, replacement, and upgrade choice says something about what kind of institution I am trying to keep alive.
