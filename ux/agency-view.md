# Containment Protocol — Agency View Spec

## Purpose

This document defines the Agency view for Containment Protocol.

The Agency view is the player’s institutional overview screen.
It is where the player checks:

- organizational condition
- current bottlenecks
- support and specialist state
- readiness and recovery posture
- major pressure signals
- strategic capacity before making deployment decisions

This is not the mission-routing screen and not the hub-opportunity screen.
It is the “how healthy is the machine?” screen.

This spec is for:

- UX design
- wireframing
- interaction planning
- UI implementation
- report/system integration

---

## Design goals

The Agency view should:

- give the player a fast institutional health read
- surface current bottlenecks clearly
- connect agency state to actionable next steps
- help the player understand what the organization can sustain this week
- make recovery/support/specialist strain visible
- support efficient movement into operations, procurement, or reports

The Agency view should not:

- become a duplicate mission board
- become a giant roster spreadsheet by default
- bury critical warnings under secondary information
- try to show every entity in maximum detail at once

---

## 1. Core player questions

The Agency view should answer these questions immediately:

1. What is the overall condition of the agency?
2. What is overloaded or bottlenecked right now?
3. Which teams are ready, degraded, or unavailable?
4. Is support capacity sufficient for this week’s likely workload?
5. Are recovery, specialist, funding, or legitimacy problems constraining us?
6. What is the most important thing to fix before I deploy?

If the screen does not answer those well, it is failing.

---

## 2. Primary use cases

### Use case A — Weekly check-in

The player opens Agency first to understand current condition before routing missions.

### Use case B — Bottleneck diagnosis

The player reads a report note like “support shortage degraded clean follow-through” and opens Agency to see the current institutional blocker.

### Use case C — Recovery review

The player wants to know whether teams, gear, and support have recovered enough to sustain another operation.

### Use case D — Strategic stabilization

The player decides whether to expand, hold, recover, or reduce concurrent commitments.

---

## 3. Recommended layout

```text
+------------------------------------------------------------------+
| Status Bar / Pressure Strip                                      |
| Week | Funding | Legitimacy | Standing | Support | Major Alerts  |
+------------------------------------------------------------------+
| Agency Summary                                                    |
| Overall condition | support | recovery | overload | readiness     |
+-----------------------------+------------------------------------+
| Team Readiness              | Bottlenecks                        |
| - Team A ready              | - Support strained                 |
| - Team B degraded           | - Maintenance bottleneck           |
| - Team C recovering         | - Legitimacy pressure              |
+-----------------------------+------------------------------------+
| Support / Specialists       | Recovery / Attrition              |
| - support available         | - operative recovery queue         |
| - specialist status         | - equipment recovery summary       |
| - overload risk             | - replacement pressure             |
+-----------------------------+------------------------------------+
| Facilities / Capacity       | Economy / Institutional State      |
| - upgrades                  | - funding / upkeep                 |
| - training capacity         | - standing                         |
| - support modifiers         | - projected stress                 |
+------------------------------------------------------------------+
| Context actions: Inspect team | View report cause | Go to ops    |
+------------------------------------------------------------------+
```

---

## 4. Information hierarchy

### Highest priority

These must be near the top:

- critical overload states
- support shortage
- recovery bottlenecks
- team availability
- major institutional warnings

### Medium priority

These should remain visible but secondary:

- funding
- legitimacy
- standing
- facilities
- capacity growth

### Lower priority

These can be drilldown views:

- full operative-level roster detail
- deep historical logs
- rarely used static reference information

---

## 5. Main screen sections

### 5.1 Agency summary header

#### Purpose — Agency summary header

Provide a quick snapshot of institutional condition.

#### Contents — Agency summary header

- overall condition label
- support state
- recovery load
- overload indicator
- readiness summary
- maybe short strategic summary line

#### Example summary text — Agency summary header

Stable

Strained

Overloaded

Recovering

Capacity constrained

#### Example quick metrics — Agency summary header

active teams ready: 2

support available: 1

recovery pressure: high

legitimacy: stable

#### Design note — Agency summary header

This section should allow the player to orient in seconds.

### 5.2 Team readiness section

#### Purpose — Team readiness section

Show which teams are deployable.

#### Should display — Team readiness section

- team name
- status: ready / degraded / recovering / deployed
- readiness level
- key warning if present
- assigned mission if currently active

#### Example row — Team readiness section

Team A — Ready — readiness 72 — no blocking issues
Team B — Degraded — readiness 44 — recovering trauma
Team C — Recovering — unavailable this week

#### Interaction — Team readiness section

Clicking a team opens team detail or quick panel.

#### Design rule — Team readiness section

Do not force the player into full operative drilldown just to know whether a team can go out.

### 5.3 Bottlenecks section

#### Purpose — Bottlenecks section

Show the most important institutional constraints right now.

#### Example bottlenecks — Bottlenecks section

Support strain active

Maintenance bottleneck delaying recovery

Low legitimacy narrowing clean intervention

Replacement pressure after recent losses

Funding below projected weekly demand

Coordination overload risk under concurrent routing

#### Design rule — Bottlenecks section

This section should prioritize the few bottlenecks most likely to affect next decisions.

#### Interaction — Bottlenecks section

Each bottleneck should be linkable to:

- relevant report note
- relevant team
- support/procurement/recovery detail
- operations warning context

### 5.4 Support / specialists section

#### Purpose — Support / specialists section

Show non-field institutional capacity.

#### Should display — Support / specialists section

- support available
- support shortage or overload risk
- active support effects
- active specialist lanes if relevant
- current specialist bottlenecks
- current specialist throughput success where applicable

#### Example — Support / specialists section

Support: 2 available
Maintenance specialists: 1 available
Current risk: concurrent routing likely to exceed support capacity

#### Design rule — Support / specialists section

Keep this at an institution level.
Do not turn it into a support roster manager.

### 5.5 Recovery / attrition section

#### Purpose — Recovery / attrition section

Show delayed costs from prior operational activity.

#### Should display — Recovery / attrition section

- operative recovery queue summary
- equipment recovery summary
- recovery bottlenecks
- losses requiring replacement
- replacement pressure if present

#### Example — Recovery / attrition section

1 operative still recovering

2 damaged equipment items awaiting recovery

maintenance bottleneck delaying one repair

replacement pressure active after recent loss

#### Why this matters — Recovery / attrition section

This is where the player sees how prior weeks are constraining future action.

### 5.6 Facilities / capacity section

#### Purpose — Facilities / capacity section

Show institutional long-horizon growth state.

#### Should display — Facilities / capacity section

- major facility upgrades
- capacity expansions
- training capacity
- recovery/procurement/support-affecting infrastructure

#### Design rule — Facilities / capacity section

This section should be concise on the main screen and allow drilldown if needed.

### 5.7 Economy / institutional state section

#### Purpose — Economy / institutional state section

Show broader strategic condition.

#### Should display — Economy / institutional state section

- current funding
- upkeep or projected burden if useful
- legitimacy
- standing
- strategic warnings connected to them

#### Design note — Economy / institutional state section

This section is important, but should not overpower operational bottleneck visibility.

---

## 6. Drilldown behavior

### Team drilldown

#### Rule — Team drilldown

Drilldowns should help the player move from “I see the problem” to “I know where to act.”

### Bottleneck drilldown

Should reveal:

- cause
- current consequence
- likely next-week effect
- where to act on it

### Support drilldown

Should reveal:

- support-sensitive paths
- shortage consequences
- current or recent report explanations
- if possible, what is consuming capacity

---

## 7. Navigation behavior

Agency should be easy to enter from:

- reports
- operations
- procurement

Agency should provide clean jumps to:

- Operations
- Procurement
- Reports
- specific team detail
- relevant bottleneck context

### Example navigation links — Navigation behavior

click “support shortage” -> support panel or operations warnings

click “maintenance bottleneck” -> procurement/recovery detail

click “Team B degraded” -> team detail

click report-linked cause -> highlighted bottleneck panel

---

## 8. Empty / warning / edge states

### Empty state — no major blockers

If the agency is stable:

- surface “No critical bottlenecks this week”
- still show readiness and support summaries

### Warning state — moderate strain

Examples:

- support strain active
- recovery backlog growing
- one team deployable, one degraded

### Critical state — overload

Examples:

- no fully ready teams
- support below current demand
- recovery and replacement pressure both active
- legitimacy or funding sharply constraining clean action

These states should be visually distinct but not melodramatic.

---

## 9. Interaction patterns

### Pattern A — scan then drill down

The main view should support fast scanning.
Only drill down when needed.

### Pattern B — warning to action

A warning should connect to something actionable.

Bad:

“Overload risk”

Good:

“Overload risk — concurrent routing likely to degrade clean follow-through”

### Pattern C — summary to systems understanding

A player should not need to memorize hidden simulation rules.
The Agency view should teach system relationships over time.

---

## 10. Tone and copy

Agency view copy should be:

- concise
- institutional
- direct
- low-flavor
- causal where needed

Good:

Support strain active

Maintenance bottleneck delaying recovery

Replacement pressure increased this week

One team unavailable for clean deployment

Bad:

The agency is creaking under the weight of unseen burdens

Your people are in bad shape

Things are getting messy

---

## 11. Example wireframe content

Agency Summary
Status: Strained
Support: 1 available
Recovery load: elevated
Legitimacy: stable

Teams

- Team A — Ready
- Team B — Degraded (trauma)
- Team C — Recovering

Bottlenecks

- Support shortage likely under concurrent deployment
- Maintenance bottleneck delaying 1 equipment recovery
- Replacement pressure remains active

Recovery

- 1 operative in recovery
- 2 equipment items pending repair

Institution

- Funding: 18
- Standing: 41
- Facility upgrades: Med Bay II, Training Room I

---

## 12. What should not be here

Do not make the Agency view:

- a duplicate mission list
- the primary rumor browser
- a full faction encyclopedia
- a giant operative spreadsheet by default
- a hidden submenu maze

It is the institutional health dashboard.

---

## 13. Testing / UX validation questions

The Agency view is successful if a tester can answer in under 10 seconds:

- how many teams can deploy?
- what is the current biggest bottleneck?
- is support strained?
- is recovery likely to limit next week?
- what should the player check before routing more work?

If they cannot, the hierarchy is wrong.

---

## 14. Acceptance criteria

The Agency view is complete when:

- major institutional bottlenecks are obvious
- team readiness is clearly surfaced
- support/specialist state is understandable
- recovery and attrition are visible
- the view links clearly into operations/procurement/reports
- it helps the player plan the week rather than merely inspect numbers

---

## 15. Summary

The Agency view should make the player feel like they are standing over the organization’s operating table.

It should answer:

- what condition is the agency in?
- what can it really sustain?
- where is the bottleneck?
- what breaks if I push harder this week?

The player should feel:

I understand the machine well enough to decide what it can risk next.
