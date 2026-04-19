# Containment Protocol — Escalation and Fallout Tuning Spec

## Purpose

This document defines the tuning approach for escalation and fallout in Containment Protocol.

Escalation and fallout are two of the main ways the campaign remembers weak response, delay, overload, and visible failure.

They determine:

- how problems worsen over time
- how imperfect outcomes create future burdens
- how unresolved pressure spills into other systems
- how the player feels the cost of “not clean enough”
- how the campaign becomes harder in specific, explainable ways

This document is not the core design spec for incident generation, pressure mechanics, or mission resolution.

It is the tuning reference for:

- how quickly escalation rises
- when fallout should appear
- how severe fallout should be
- how different types of fallout should be distributed
- how escalation and fallout should interact without overwhelming the campaign

This spec is for:

- systems tuning
- balancing
- implementation parameterization
- QA consequence review
- campaign pacing evaluation

---

## Design goals

Escalation and fallout tuning should:

- make delay and imperfect execution matter
- preserve campaign continuity through visible consequence
- keep partial success meaningfully different from clean success
- create future strategic burdens without making every mistake fatal
- support deterministic and explainable consequence chains
- differentiate local worsening from broader institutional spillover
- remain bounded enough for the player to learn from

Escalation and fallout tuning should not:

- punish every imperfect week with catastrophic collapse
- produce consequence chains so weak they can be ignored
- rely on invisible global difficulty inflation
- make all failures feel identical
- flood the campaign with persistent debris the player cannot realistically manage

---

## 1. What escalation is

Escalation is the worsening of a problem over time or through ineffective handling.

Escalation usually means:

- higher incident severity
- worse site or district conditions
- narrower clean-response windows
- higher visibility
- stronger hostile conditions
- increased downstream strategic cost

Escalation answers:

- what happens if we delay?
- what happens if we contain this badly?
- when does a manageable problem become a dangerous one?

Escalation is usually attached to the problem itself.

---

## 2. What fallout is

Fallout is the downstream consequence produced by imperfect execution, overload, visibility, damage, or weak follow-through.

Fallout usually means:

- injuries
- recovery burden
- equipment damage
- legitimacy loss
- faction friction
- visibility increase
- follow-on incidents
- support strain
- next-week readiness loss

Fallout answers:

- what did this cost us?
- what did this leave behind?
- what is now harder because of what just happened?

Fallout is usually attached to the agency, the world, or future state, not just the original incident.

---

## 3. Escalation and fallout philosophy

Escalation and fallout should together create the campaign memory of imperfect play.

Preferred pattern:

```text
Delay or weak response

-> escalation worsens the active problem

-> mission resolves under harsher conditions

-> outcome creates fallout

-> fallout changes future agency/world state
```

This means:

- escalation makes the current problem worse
- fallout makes future planning harder
- both should be caused, bounded, and visible

## 4. Tuning goals by outcome quality

### 4.1 Clean success

#### Expected tuning outcome — Clean success

- low or no meaningful fallout
- escalation halted or reduced
- future state improved or stabilized

#### Design role — Clean success

Clean success should feel materially valuable.

### 4.2 Success with cost

#### Expected tuning outcome — Success with cost

- primary goal achieved
- one bounded fallout item or reduced cleanliness
- limited but visible strategic burden remains

#### Design role — Success with cost

This keeps the campaign textured even when the player wins.

### 4.3 Partial success

#### Expected tuning outcome — Partial success

- immediate problem partly addressed
- escalation often reduced but not removed
- fallout common
- future work or pressure remains

#### Design role — Partial success

This should be one of the most common consequence patterns in the game.

### 4.4 Failure with containment

#### Expected tuning outcome — Failure with containment

- main objective missed
- worst-case outcome avoided
- moderate fallout or persistent escalation remains

#### Design role — Failure with containment

This allows failure to create future decisions rather than immediate dead ends.

### 4.5 Escalating failure

#### Expected tuning outcome — Escalating failure

- objective missed
- active problem worsens
- broader fallout appears
- future pressure rises across multiple systems

#### Design role — Escalating failure

This should feel dangerous, but not arbitrary.

## 5. Escalation tuning principles

### Rule 1: Escalation should be readable

The player should know that delay or weak containment worsens conditions.

### Rule 2: Escalation should usually rise in steps, not hidden gradients

Bands are easier to understand and surface.

### Rule 3: Escalation should differ by incident type

Not every problem should worsen at the same pace.

### Rule 4: Escalation should interact with visibility, legitimacy, and factions where appropriate

This helps the campaign feel systemic.

### Rule 5: Escalation should not always mean “just bigger numbers”

It can also mean worse access, worse information, more social cost, or reduced clean-response options.

## 6. Fallout tuning principles

### Rule 1: Fallout should usually be specific

Good fallout names the burden:

- injury
- support strain
- visibility increase
- recovery delay

Not vague “the situation worsened.”

### Rule 2: Fallout should often be one or two meaningful things, not five weak things

A small number of strong consequences is more legible than a long weak list.

### Rule 3: Fallout should match the source problem

A medical rescue failure should not produce the same fallout profile as a public anomaly spillover unless the shared cause supports it.

### Rule 4: Fallout should often be campaign-facing, not only mission-facing

The player should feel the consequence next week.

### Rule 5: Fallout should preserve learning

The player should be able to answer:

- what caused this fallout?
- how could I reduce it next time?

## 7. Escalation bands

Escalation should generally behave in bounded bands.

### 7.1 Stable

#### Description — Stable

The problem is active but not yet worsening meaningfully.

#### Typical tuning effect — Stable

- wide response window
- lower fallout risk
- cleaner intervention still plausible

### 7.2 Rising

#### Description — Rising

The problem is worsening and beginning to pressure the player.

#### Typical tuning effect — Rising

- stronger urgency
- higher mission difficulty
- increased visibility or worsening local condition

### 7.3 Severe

#### Description — Severe

The problem has become strategically dangerous.

#### Typical tuning effect — Severe

- cleaner outcomes are harder
- partial outcomes are more costly
- failure is more likely to spill over

### 7.4 Critical

#### Description — Critical

The problem is now likely to create broader campaign damage if mishandled again.

#### Typical tuning effect — Critical

- narrow clean-response window
- strong fallout risk
- follow-on incidents or district effects plausible

## 8. Fallout categories

Fallout should usually be tuned in recognizable categories.

### 8.1 Personnel fallout

**Examples:**

- injury
- trauma
- loss
- downtime increase

#### Tuning role — Personnel fallout

Makes team-management consequences persistent.

### 8.2 Recovery fallout

**Examples:**

- repair backlog
- delayed equipment return
- recovery queue growth
- specialist workload increase

#### Tuning role — Recovery fallout

Creates next-week operational friction.

### 8.3 Support fallout

**Examples:**

- support strain
- reduced clean follow-through next week
- institutional overload warning
- throughput degradation

#### Tuning role — Support fallout

Connects mission quality to agency-side consequence.

### 8.4 Visibility and legitimacy fallout

**Examples:**

- district visibility increase
- legitimacy loss
- authority friction
- cleaner access narrowed

#### Tuning role — Visibility and legitimacy fallout

Makes visible imperfection politically meaningful.

### 8.5 Faction fallout

**Examples:**

- relationship deterioration
- distorted opportunity quality
- access reduction
- retaliatory pressure

#### Tuning role — Faction fallout

Makes the wider world react.

### 8.6 Incident-chain fallout

**Examples:**

- follow-on incidents
- unresolved spillover
- secondary local instability
- district rumor density increase

#### Tuning role — Incident-chain fallout

Allows the campaign to generate future work from current weakness.

## 9. Escalation rate tuning

Escalation rates should vary by problem type.

### Slower escalation candidates

These should often allow some delay:

- lower-visibility anomalies
- low-severity local distortions
- less urgent contract opportunities

### Faster escalation candidates

These should punish delay more aggressively:

- public-facing failures
- active visibility-sensitive incidents
- unstable infrastructure with spread potential
- faction-contested interventions
- survivor recovery windows

#### Design rule — Escalation rate

Escalation rate should match both fiction and strategic role.

## 10. Fallout severity tuning

Fallout severity should usually follow outcome quality and bottleneck intensity.

### Light fallout

Useful when:

- mission largely succeeded
- one weakness mattered
- consequence should be visible but manageable

### Moderate fallout

Useful when:

- mission ended partial
- follow-through degraded
- one or two systems should feel the cost next week

### Heavy fallout

Useful when:

- mission failed badly
- escalation was already severe
- multiple compounding weaknesses existed

#### Design rule — Fallout severity

Heavy fallout should be the result of meaningful threshold crossings, not minor imperfection.

## 11. Good escalation patterns

### Pattern A — delay-driven worsening

One or more ignored weeks increases severity and narrows clean response.

### Pattern B — partial containment carryover

The immediate problem is suppressed, but future instability remains.

### Pattern C — visibility escalation

Public exposure increases the political or social cost of future action.

### Pattern D — chain escalation

One unresolved incident creates another related problem later.

These help the campaign feel reactive and stateful.

## 12. Good fallout patterns

### Pattern A — success with burden

Mission succeeds, but recovery backlog grows.

### Pattern B — partial with visible cost

Mission stabilizes the site, but legitimacy or visibility worsens.

### Pattern C — failure with containment

Main objective missed, but broader catastrophe avoided at notable institutional cost.

### Pattern D — overloaded success

Mission succeeds operationally, but support strain or coordination friction leaves the agency weaker next week.

These patterns preserve institutional play.

## 13. Bad patterns to avoid

### Bad pattern 1: Universal fallout

If every mission always produces similar fallout, consequence loses meaning.

### Bad pattern 2: Escalation without warning

If problems jump bands too abruptly, the system feels unfair.

### Bad pattern 3: Too much persistent debris

If every week leaves too many permanent burdens, the campaign becomes unreadable.

### Bad pattern 4: Pure numerical escalation only

If escalation is only bigger numbers, the player learns less.

### Bad pattern 5: Consequence without cause

If fallout appears without a visible reason, the game loses trust.

## 14. Example escalation chains

### Example chain: delayed public anomaly

Incident ignored

-> visibility rises

-> legitimacy sensitivity increases

-> mission resolves under worse conditions

-> partial result creates district visibility fallout

-> next week hub rumors become more distorted

### Example chain: repeated weak containment

Partial containment

-> local instability remains

-> follow-on incident appears

-> recovery burden persists

-> support strain narrows future clean execution

These are good chains because each step is explainable.

## 15. Example fallout distributions

### Clean success

- no persistent fallout
- maybe one low-severity note only

### Success with cost

- one bounded fallout item
- often recovery or visibility related

### Partial

- one to two fallout items
- usually one immediate and one carryover-facing

### Failure with containment

- moderate fallout
- escalation preserved or worsened
- future work created

### Escalating failure

- stronger fallout
- broader pressure shift
- strategic cost visible next week

## 16. Interaction with other systems

### Pressure mechanics

Escalation should feed pressure; fallout should often persist as pressure.

### Mission resolution

Outcome quality should strongly affect fallout distribution.

### Support operations

Support weakness should commonly affect follow-through fallout.

### Team management

Personnel and readiness fallout should persist through recovery and replacement pressure.

### Factions and legitimacy

Visible or mishandled outcomes should shift these systems in bounded ways.

### Hub simulation

Fallout may alter opportunity quality, rumor distortion, and district behavior.

## 17. Surfacing rules

Escalation and fallout only work well if surfaced clearly.

The player should be able to see:

- what escalated
- why it escalated
- what fallout occurred
- what system now carries the burden
- whether the consequence is local, institutional, or future-facing

**Good surfaced examples:**

- Escalation increased site hostility before deployment.
- Partial containment left district visibility elevated.
- Support shortage degraded clean follow-through.
- Maintenance bottleneck delayed full recovery.
- Rival interference worsened local rumor quality after failure.

## 18. QA and balancing review questions

Review and testing should ask:

- does one ignored week matter enough?
- does repeated delay clearly worsen consequences?
- are partial outcomes meaningfully different from clean success?
- does fallout create future decisions rather than just punishment?
- are heavy fallout states tied to obvious threshold crossings?
- do escalation and fallout chain across systems in understandable ways?
- does the campaign remain recoverable after moderate fallout accumulation?

**Determinism tests should verify:**

- same input state -> same escalation band changes
- same outcome quality -> same fallout selection rules
- surfaced explanations match canonical cause data

## 19. Acceptance criteria

Escalation and fallout tuning is working when:

- delay creates visible worsening
- partials create meaningful but bounded future burden
- heavy fallout is tied to clear causes
- escalation and fallout feel different but connected
- consequence chains are readable
- campaign continuity is reinforced without runaway clutter
- the player can learn how to reduce future fallout through better planning

## 20. Summary

Escalation and fallout in Containment Protocol should determine how current weakness becomes future difficulty.

They should:

- make delay dangerous
- make imperfect execution costly
- create campaign memory
- connect local outcomes to institutional consequence
- remain deterministic, bounded, and visible

The player should feel:

every week leaves a trace, and whether that trace is manageable strain or dangerous spillover depends on how cleanly the institution handled the problem.
