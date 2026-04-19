# Containment Protocol — Mission Triage View Spec

## Purpose

This document defines the Mission Triage view for Containment Protocol.

The Mission Triage view is the screen where the player reviews incoming work and decides:

- what to prioritize
- what to route now
- what to defer
- what to ignore temporarily
- which tasks are worth the current institutional cost

This is the main operational planning surface.
It converts campaign pressure into player choice.

This spec is for:

- UX design
- wireframing
- interaction design
- system integration
- implementation planning
- QA validation

---

## Design goals

The Mission Triage view should:

- make the week’s incoming work legible
- force meaningful prioritization
- clearly show urgency, severity, and cost
- connect incidents, leads, contracts, and opportunities into one decision surface
- surface likely bottlenecks before commitment
- support quick comparison between options
- make deferral feel meaningful, not passive

The Mission Triage view should not:

- hide critical tradeoffs
- bury routing choices under dense UI
- duplicate the Agency view
- require multiple screens just to compare obvious candidates
- become a tactical mission detail screen

---

## 1. Core player questions

The Mission Triage view should answer:

1. What needs attention this week?
2. What is urgent versus merely useful?
3. What becomes worse if delayed?
4. What can the agency realistically sustain?
5. Which opportunities are clean, risky, filtered, or misleading?
6. What should be routed now, and what should wait?

If the player cannot answer those quickly, the screen is failing.

---

## 2. What belongs in mission triage

Mission Triage is where all actionable incoming work should be compared in one place.

This may include:

- incidents
- contracts
- converted leads
- high-confidence hub opportunities
- follow-up response tasks
- unresolved or escalating carryover work

This screen should unify “things the player could act on now.”

---

## 3. Recommended layout

```text
+------------------------------------------------------------------+
| Status Bar / Pressure Strip                                      |
| Week | Funding | Support | Major Warnings                        |
+------------------------------------------------------------------+
| Filters / Sort / Tabs                                             |
| All | Incidents | Contracts | Leads | Escalating | Assigned      |
+-----------------------------+------------------------------------+
| Triage List                 | Selected Item Detail               |
| - high severity incident    | title                              |
| - contract                  | source / type                      |
| - lead                      | urgency / severity                 |
| - follow-up operation       | likely constraints                 |
|                             | support / readiness warnings       |
|                             | escalation if delayed              |
|                             | route now / defer / ignore         |
+-----------------------------+------------------------------------+
| Context Footer                                                  |
| projected support load | team availability | advance risk       |
+------------------------------------------------------------------+
```

---

## 4. Information hierarchy

### Highest priority

- what is actionable now
- urgency / severity / escalation
- support/readiness warnings
- likely downside of delay
- whether the item is direct, uncertain, or socially filtered

### Medium priority

- source
- reward/value
- faction sensitivity
- location / district
- opportunity classification

### Lower priority

- deep world lore
- full historical context
- detailed operative-level assignment data

Those can live in linked drilldowns.

---

## 5. Main screen sections

### 5.1 Triage list

#### Purpose — Triage list

Presents all current actionable work in a scan-friendly list.

#### Each row should show — Triage list

- title
- item type (incident / contract / lead / follow-up)
- urgency/severity indicator
- time pressure / escalation risk if relevant
- one key warning or opportunity marker
- source or district if useful

#### Example row — Triage list

Unresponsive Freight Archive
Incident • High severity • Escalating
Warning: support-sensitive

#### Design rule — Triage list

A player should be able to scan the list and immediately identify:

- what looks urgent
- what looks expensive
- what looks promising but uncertain

### 5.2 Selected item detail panel

#### Purpose — Selected item detail panel

Shows the currently selected item in more detail.

#### Should display — Selected item detail panel

- title
- source/type
- objective framing or problem summary
- urgency / severity
- likely escalation if delayed
- key constraints
- likely required capability
- support/specialist/readiness warnings
- likely value or consequence

#### Example structure — Selected item detail panel

Title
Type / source
Summary
Urgency / severity
Escalation if delayed
Likely requirements
Warnings
Actions

#### Design rule — Selected item detail panel

This panel should help the player decide, not drown them in prose.

### 5.3 Filters and sort controls

#### Purpose — Filters and sort controls

Help the player reduce list overload.

#### Suggested filters — Filters and sort controls

- all
- incidents
- contracts
- leads
- escalating
- assigned
- support-sensitive
- faction-sensitive
- time-critical

#### Suggested sorting — Filters and sort controls

- urgency
- severity
- escalation risk
- reward/value
- support burden
- newest surfaced

#### Design rule — Filters and sort controls

Filtering should support comparison, not hide the campaign behind UI bureaucracy.

### 5.4 Context footer / projected load strip

#### Purpose — Context footer / projected load strip

Show what current routing choices imply.

#### May display — Context footer / projected load strip

- projected support strain
- team availability count
- unresolved urgent items count
- overload risk
- escalation carryover risk

#### Example — Context footer / projected load strip

Projected support load: high
Teams available: 2
Urgent items unresolved if deferred: 1

This helps keep triage tied to agency condition.

---

## 6. Item categories

The triage view should visually distinguish item types.

### 6.1 Incident

A direct problem requiring response.

Player expectation:

- operationally clear
- usually higher urgency
- often tied to escalation

### 6.2 Contract

A structured opportunity with reward/obligation framing.

Player expectation:

- clear reward
- external source
- possible faction/legitimacy implications

### 6.3 Lead

A more actionable but still uncertain opportunity.

Player expectation:

- higher uncertainty
- potentially high leverage
- may require recon or confirmation

### 6.4 Follow-up

A mission or problem produced by prior outcomes.

Player expectation:

- continuity
- consequence management
- often pressure-sensitive

#### Design rule — Item categories

Item type should shape expectation without requiring deep reading.

---

## 7. Key data the player needs per item

For each item, the triage screen should expose:

- title
- type
- urgency/severity
- whether it escalates if delayed
- one-line summary
- likely bottleneck or risk
- possible reward / strategic value
- source or district if relevant
- whether information is partial or filtered

This is the minimum useful comparison set.

---

## 8. Warnings and pressure surfacing

Mission Triage should be one of the main places pressure becomes actionable.

Warnings may include:

- support shortage likely
- maintenance bottleneck may delay recovery
- low readiness team only
- recon gap likely
- faction sensitivity
- legitimacy-sensitive response
- coordination overload risk
- escalating if deferred

Good warning text

Support-sensitive under current load

Escalates if delayed

Clean response unlikely under current legitimacy

Recon gap increases exposure risk

Bad warning text

This may be difficult

Some systems may be affected

Risk unknown

Warnings should always imply something specific.

---

## 9. Deferral behavior

Deferral is a meaningful player action.

When deferring an item, the UI should make clear:

- what likely worsens
- what the cost of waiting is
- whether deferral is acceptable or reckless

Good deferred state text

Delay likely increases district visibility

Response window narrows next week

Escalation risk rises if left unresolved

### Design rule — Deferral behavior

Deferral should never feel like “close this for later and forget it.”

---

## 10. Interaction patterns

### Pattern A — scan -> compare -> inspect -> route

Primary flow:

- scan list
- compare priorities
- inspect details
- route or defer

### Pattern B — report to triage

After a weekly report, the player should often land here already knowing:

- what carried over
- what new pressure exists
- what needs response now

### Pattern C — agency to triage

The player checks agency bottlenecks, then comes here to route only what capacity can sustain.

---

## 11. Route-now action

The “Route now” action should:

- mark the item as committed to operational planning
- not yet necessarily fully deploy the team
- move the task into a prepared/assigned state

This lets triage stay distinct from final deployment.

Why this matters

The player often needs two decisions:

- is this worth doing this week?
- which team actually gets it?

Mission Triage is mostly about question 1.

---

## 12. Drilldowns and linked navigation

From selected item detail, the player should be able to jump to:

- team assignment/deployment flow
- source report or prior note
- relevant district/hub context
- faction/contact context if relevant
- agency bottleneck view

This keeps triage connected to the rest of the loop.

---

## 13. Visual grouping suggestions

You may visually group items by:

- urgent / non-urgent
- direct / uncertain
- public / low-visibility
- escalating / stable
- local / faction-linked

This can make large weekly lists easier to read.

---

## 14. Example wireframe content

### Triage List

[High] Unresponsive Freight Archive
Incident • Escalating • Support-sensitive

[Medium] Brokered Clinic Retrieval
Contract • Faction-linked • Low visibility

[Low] Night Traffic Avoiding Old Bridge
Lead • Partial info • Recon-first

### Selected Item

Unresponsive Freight Archive
Incident • River District

Ground access remains open, but district activity is increasing.
Archive systems remain active and repeated movement signatures persist.

Escalation if delayed:

- district visibility rises
- clean recovery window narrows

Warnings:

- support-sensitive
- recon recommended
- public exposure risk increasing

Actions:

[Route now] [Defer] [Ignore]

---

## 15. What should not live here

Do not make Mission Triage:

- a full deployment configuration screen
- a gear purchasing screen
- a full rumor archive
- a complete faction encyclopedia
- a dense postmortem report browser

Mission Triage is the prioritization and routing surface.

---

## 16. UX validation questions

A tester using this screen should be able to answer quickly:

- what is most urgent?
- what can wait?
- what is likely to get worse?
- which item is dangerous because of agency strain rather than mission severity?
- which items are uncertain but potentially valuable?

If they cannot, the hierarchy or wording needs revision.

---

## 17. Acceptance criteria

The Mission Triage view is complete when:

- the player can compare incoming work efficiently
- urgency and escalation are clearly visible
- risk and bottleneck warnings are understandable
- route/defer choices feel consequential
- the screen connects cleanly to deployment and agency review
- the player can make weekly prioritization decisions without deep UI friction

---

## 18. Summary

Mission Triage should feel like standing at the agency’s intake board with too many real problems and not enough clean capacity.

It should force the player to think:

- what matters most now?
- what can we actually sustain?
- what becomes dangerous if we wait?
- where are we overcommitting already?

The player should feel:

this is where campaign pressure becomes strategy.
