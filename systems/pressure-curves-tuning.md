# Containment Protocol — Pressure Curves Tuning Spec

## Purpose

This document defines the tuning approach for pressure curves in Containment Protocol.

Pressure curves determine how strategic strain rises, stabilizes, or compounds across the campaign as the player:

- resolves incidents
- delays work
- overcommits teams
- absorbs fallout
- expands too fast
- loses institutional stability
- recovers or fails to recover from prior weeks

This document is not the core design spec for pressure mechanics.

It is the tuning reference for:

- how fast pressure rises
- when pressure becomes visible
- when pressure becomes dangerous
- how relief paths should offset pressure
- how campaign pacing should feel across short, medium, and longer runs

This spec is for:

- systems tuning
- balancing
- implementation parameterization
- QA pacing review
- campaign feel evaluation

---

## Design goals

Pressure curves should:

- create steady strategic tension
- punish neglect and overextension without making failure immediate
- allow recovery and stabilization to matter
- escalate in understandable bands rather than chaotic spikes
- create a campaign rhythm of strain, adaptation, and consequence
- remain deterministic and inspectable
- support a bounded but deep management loop

Pressure curves should not:

- produce arbitrary difficulty cliffs
- remain flat enough that triage becomes trivial
- become so steep that one bad week ends the campaign
- depend on hidden bonus scaling the player cannot read
- turn all weeks into maximum overload by default

---

## 1. What a pressure curve is

A pressure curve is the rate and pattern by which strategic strain changes over time under given conditions.

In Containment Protocol, pressure curves should govern things like:

- unresolved incident escalation
- support strain accumulation
- recovery backlog growth
- legitimacy deterioration under visible failure
- faction pressure under repeated friction
- overload risk under concurrent commitments
- replacement pressure after losses

A pressure curve answers questions like:

- how much worse does this get if ignored for one week?
- when does a manageable burden become a real bottleneck?
- how quickly should relief actions matter?
- when does pressure begin to cascade into other systems?

---

## 2. Pressure curve philosophy

Pressure curves should reward disciplined stabilization and punish sustained overextension.

Preferred pattern:

```text
Low pressure
-> visible warning
-> real constraint
-> cascading consequence
-> partial institutional instability
-> dangerous overload
```

This means pressure should usually behave in bands rather than in smooth invisible difficulty inflation.

The player should be able to feel:

- when pressure is emerging
- when it is becoming costly
- when it is creating chain effects
- when recovery action is no longer optional

## 3. Core pacing target

Pressure should usually create this weekly rhythm:

### Early stable state

The agency can manage most surfaced work with tradeoffs, but not all of it.

### Building strain

A few unresolved or badly handled problems begin to push support, recovery, and legitimacy.

### Visible constraint

One or more bottlenecks now clearly reduce clean execution quality.

### Compounding state

Pressure from one system begins to worsen others.

### Recovery or collapse branch

The player either stabilizes deliberately or continues to accumulate degraded outcomes.

This creates a management sim curve rather than a single fail-state meter.

## 4. Pressure bands

Pressure curves should usually be tuned in bounded bands.

### 4.1 Low pressure

#### Description — Low pressure

The system is under load, but still functioning cleanly enough.

#### Expected player experience — Low pressure

- warnings are minimal
- tradeoffs exist, but are manageable
- clean outcomes are still common with reasonable planning

#### Typical effects — Low pressure

- no major degradation
- mild warnings only
- no cascading consequence yet

### 4.2 Rising pressure

#### Description — Rising pressure

The system is beginning to strain.

#### Expected player experience — Rising pressure

- bottlenecks become visible
- some previously clean decisions now carry cost
- deferral starts to matter

#### Typical effects — Rising pressure

- warning notes begin to appear
- one subsystem may degrade under poor planning
- stabilization choices start to compete with expansion choices

### 4.3 Active pressure

#### Description — Active pressure

The system is no longer comfortably sustainable.

#### Expected player experience — Active pressure

- constraints are shaping routing decisions directly
- clean execution is less reliable
- neglect is now expensive

#### Typical effects — Active pressure

- support shortage or overload flags activate
- escalation becomes more likely
- recovery carryover becomes common
- legitimacy or faction cost begins to narrow options

### 4.4 High pressure

#### Description — High pressure

The system is in a dangerous state that can spill into others.

#### Expected player experience — High pressure

- every additional commitment feels costly
- one bottleneck often creates another
- partial outcomes become common without correction

#### Typical effects — High pressure

- chain effects appear
- multiple warnings remain active
- some opportunities become meaningfully worse
- the player must likely stabilize before expanding

### 4.5 Critical pressure

#### Description — Critical pressure

The system is near or in breakdown territory.

#### Expected player experience — Critical pressure

- the institution feels unstable
- clean execution is rare
- immediate correction is required

#### Typical effects — Critical pressure

- major compounding consequences
- strong carryover pressure into next week
- severe routing limitations
- repeated degraded outcomes likely

#### Design rule — Critical pressure

Critical pressure should be survivable in some cases, but not comfortable or sustainable.

## 5. Curve shape principles

Pressure curves should generally follow these rules.

### Rule 1: Early pressure should be readable

The player should see warnings before catastrophic consequence.

### Rule 2: Mid-band pressure should carry the most strategic weight

This is where the player should make meaningful stabilization decisions.

### Rule 3: Critical pressure should be dangerous but not arbitrary

The player should understand why they are here.

### Rule 4: Relief should matter before total collapse

Recovery paths should have visible payoff before the campaign is already lost.

### Rule 5: Pressure should not reset too cleanly without cause

The institution should remember recent overload and failure where appropriate.

## 6. Incident escalation curves

### Desired feel — Incident escalation

- one week of delay may be tolerable for some items
- repeated delay should materially worsen conditions
- already severe incidents should escalate faster than low-grade ones

### Good curve behavior — Incident escalation

- low severity incidents escalate slowly at first
- medium severity incidents become urgent after moderate delay
- high severity incidents become strategically dangerous quickly

### Example tuning concept — Incident escalation

- severity 1: meaningful escalation after 2–3 ignored weeks
- severity 2: meaningful escalation after 1–2 ignored weeks
- severity 3+: visible worsening after 1 ignored week

### Design rule — Incident escalation

Escalation should pressure prioritization, not simply punish every deferral equally.

### 7. Support strain curves

### Desired feel — Support strain

- one support-sensitive mission is often manageable
- two overlapping burdens may create warning-level strain
- repeated concurrency should push the player into degraded follow-through

### Good curve behavior — Support strain

- low demand: no real penalty
- threshold crossing: visible support shortage risk
- repeated threshold crossing: degraded follow-through becomes common

### Design rule — Support strain

Support pressure should feel like institutional load, not just a flat mission penalty.

### 8. Recovery backlog curves

### Desired feel — Recovery backlog

- one damaged asset or one recovering operative is manageable
- several unresolved recovery items start to narrow options
- backlog becomes strategically dangerous when it persists across weeks

### Good curve behavior — Recovery backlog

- light backlog: manageable carryover
- medium backlog: readiness and flexibility narrow
- heavy backlog: future deployment choices become constrained even before new failures

### Design rule — Recovery backlog

Recovery pressure should be one of the main memory systems of the campaign.

### 9. Legitimacy pressure curves

### Desired feel — Legitimacy pressure

- one imperfect week does not destroy institutional tolerance
- repeated visible failures or collateral events do
- legitimacy loss should alter access quality before it fully collapses opportunity

### Good curve behavior — Legitimacy pressure

- minor visibility creates warning-level concern
- repeated public mishandling narrows clean access
- sustained visible failure creates harsher filtering and opportunity cost

### Design rule — Legitimacy pressure

Legitimacy should feel politically cumulative.

### 10. Faction pressure curves

### Desired feel — Faction pressure

- one disagreement creates caution
- repeated misuse, obstruction, or visible conflict changes posture materially
- strong positive handling should improve opportunity quality at a deliberate pace

### Good curve behavior — Faction pressure

- mild hostility: filtered opportunities
- moderate hostility: interference and poorer access
- high hostility: active obstruction or distortion

### Design rule — Faction pressure

Faction curves should create strategic texture, not diplomatic micromanagement.

### 11. Replacement pressure curves

### Desired feel — Replacement pressure

- single losses hurt but do not end capability immediately
- repeated losses expose thin bench problems
- recovery and recruitment delays make attrition strategically expensive

### Good curve behavior — Replacement pressure

- low loss rate: manageable institutional pain
- moderate loss rate: role gaps and readiness issues emerge
- sustained loss: training and recruitment become dominant constraints

### Design rule — Replacement pressure

Replacement pressure should reinforce the institution-first loop.

### 12. Pressure relief curves

### Desired feel — Pressure relief

- one stabilizing choice should help
- several stabilizing choices should meaningfully change next-week planning
- relief should be slower than reckless overload, but fast enough to matter

### Design rule — Pressure relief

If pressure rises quickly but relief barely matters, the campaign becomes fatalistic.

### 13. Recommended tuning patterns

#### Pattern A — stepped thresholds

Use band-based thresholds for:

- support shortage
- coordination overload
- legitimacy pressure
- replacement pressure

#### Why — Pattern A

These are easier to surface and easier for players to learn.

#### Pattern B — escalating carryover

Use carryover-sensitive curves for:

- recovery backlog
- repeated district instability
- faction hostility
- unresolved incident chains

#### Why — Pattern B

These systems should feel like memory.

#### Pattern C — weighted compounding

Use bounded compounding only where one pressure reasonably worsens another.

**Examples:**

- support strain + concurrent load -> coordination overload
- legitimacy loss + visible failure -> harsher opportunity filtering
- recovery backlog + repeated deployment -> readiness collapse

#### Why — Pattern C

This creates systemic texture without needing giant hidden equations.

### 14. Curve tuning guidelines by campaign phase

#### Early campaign

Pressure should:

- teach system relationships
- allow some mistakes without collapse
- establish that deferral and overload matter

#### Tuning bias — Early campaign

- softer escalation
- clearer warnings
- more recoverable strain

#### Mid campaign

Pressure should:

- create real bottleneck management
- reward deliberate specialization and stabilization
- produce chain effects if neglected

#### Tuning bias — Mid campaign

- stronger carryover
- more visible compounding
- fewer free clean recoveries

#### Later campaign

Pressure should:

- make sustained institutional discipline essential
- preserve recovery paths without making expansion trivial
- create multi-system strategic strain

#### Tuning bias — Later campaign

- tighter margins
- more meaningful legitimacy/faction interplay
- stronger punishment for repeated sloppiness, not random spikes

### 15. Bad curve patterns to avoid

#### Bad pattern 1: Flat pressure

If pressure barely changes over time, triage becomes obvious and dull.

#### Bad pattern 2: Cliff pressure

If one threshold instantly destroys the week, the system feels unfair.

#### Bad pattern 3: Invisible ramping

If pressure rises constantly without visible bands, players cannot learn from it.

#### Bad pattern 4: No relief slope

If recovery barely reduces pressure, the player loses strategic agency.

#### Bad pattern 5: Universal scaling

Do not solve pacing by just multiplying all bad outcomes over time.

## 16. Example conceptual curves

### Incident escalation

- week 0 ignored: warning
- week 1 ignored: severity shift for medium+ incidents
- week 2 ignored: visible fallout or follow-on work likely
- week 3 ignored: strategic cost now dominant

### Support strain

- demand <= capacity: clean
- demand = capacity + 1: warning / likely degradation
- repeated over-capacity weeks: active shortage and weaker follow-through
- severe repeated over-capacity: overload and carryover strain

### Recovery backlog

- 1 unresolved item: manageable
- 2–3 unresolved items: visible bottleneck
- 4+ unresolved items: readiness pressure and reduced flexibility
- persistent 4+: strong institutional drag

These are examples only; actual thresholds should be tuned through test runs.

## 17. Surfacing rules for pressure curves

Pressure curves only work if the player can read them.

The UI and report layer should surface:

- current pressure band
- what triggered it
- what it is affecting
- whether it is rising or stabilizing
- what relief path is available

**Good surfaced examples:**

- Support strain active
- Recovery backlog rising
- District visibility nearing critical threshold
- Legitimacy pressure narrowed clean access
- Replacement pressure remains elevated after recent losses

## 18. QA and balancing expectations

Pressure curve testing should verify:

- same state produces same pressure outcome
- warning bands appear before failure bands
- relief actions visibly reduce future pressure
- one bad week hurts, but does not usually end the campaign
- repeated neglect creates compounding cost
- mid-band play is strategically interesting
- later-band play is survivable but dangerous

Balancing review should ask:

- when do players first feel pressure?
- when do they first have to sacrifice good opportunities?
- when do pressure chains begin?
- when does stabilization feel necessary?
- when does the campaign become too punishing or too flat?

## 19. Acceptance criteria

Pressure curve tuning is working when:

- pressure emerges early enough to teach system relationships
- pressure bands are visible and interpretable
- mid-level strain creates meaningful planning tension
- relief actions matter
- compounding exists but is bounded
- late pressure is dangerous without feeling arbitrary
- campaign pacing supports repeated strategic tradeoffs rather than static optimization

## 20. Summary

Pressure curves in Containment Protocol should determine how institutional strain grows, compounds, and can be stabilized across the campaign.

They should:

- rise in readable bands
- punish repeated neglect and overextension
- preserve meaningful recovery paths
- create strategic tension across weeks
- make the institution feel increasingly stressed when mismanaged

The player should feel:

pressure is not random difficulty — it is the measurable cost of what I delayed, overloaded, mishandled, or failed to stabilize.
