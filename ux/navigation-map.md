# Containment Protocol — Navigation Map

## Purpose

This document defines the high-level navigation structure for Containment Protocol.

It covers:

- primary screens
- player movement between screens
- major interaction flows
- information hierarchy
- when each screen is used
- what should and should not live on each screen

The goal is to keep navigation:

- legible
- institutional
- low-friction
- deterministic
- focused on weekly decision-making rather than exploratory UI wandering

---

## Navigation principles

### 1. The player is running an agency

Navigation should feel like operating an institution, not piloting a character through rooms.

### 2. The week is the main interaction frame

Most navigation exists to support:

- reviewing current state
- making bounded decisions
- advancing the week with intent

### 3. Important decisions should be one or two steps away

The player should not dig through deep nested menus to:

- triage incidents
- inspect team readiness
- view current bottlenecks
- deploy teams
- understand results

### 4. Reports and pressure visibility are always near the surface

The player should never be unsure where to check:

- what happened
- why it happened
- what is overloaded
- what must be fixed next

### 5. The hub is a strategic surface, not a separate game mode

Hub navigation should stay bounded and decision-focused.

---

## 1. Primary navigation structure

### Top-level screens

```text
Agency
Operations
Hub
Procurement
Reports
Reference
```

Optional later additions may include:

World / Regions

Factions

Facilities

Personnel

But these should appear only if they earn their place and do not fragment the loop.

### 2. Recommended shell layout

Global shell

+-------------------------------------------------------------+
| Status Bar / Pressure Strip                                 |
| Week | Funding | Legitimacy | Support | Active Pressure     |
+-------------------------------------------------------------+
| Left Nav      | Main Content Area            | Context Panel |
|               |                              |               |
| Agency        |                              | warnings      |
| Operations    |                              | bottlenecks   |
| Hub           |                              | projections   |
| Procurement   |                              | notes         |
| Reports       |                              | quick actions |
| Reference     |                              |               |
+-------------------------------------------------------------+
| Primary action row: Advance Week / Commit / Cancel / Back   |
+-------------------------------------------------------------+

Persistent shell elements

Status bar / pressure strip

Always visible.
Shows:

current week

funding

legitimacy

support capacity

major overload/bottleneck warnings

unresolved critical incidents count if needed

Left navigation

Primary movement between major game surfaces.

Context panel

Shows:

current bottlenecks

report note excerpts

mission warnings

quick explanation

projection snapshots

This helps maintain legibility without forcing constant screen switching.

### 3. Top-level screens in detail

#### 3.1 Agency

Purpose

The agency screen is the institutional overview.

This is where the player answers:

what condition is the organization in?

what is overloaded?

what is recovering?

what capacity is missing?

what can be improved?

Displays

agency summary

support state

specialist bottlenecks

active pressure

team roster summary

readiness overview

recovery queues

facility state

funding/upkeep summary

Primary actions

inspect bottlenecks

inspect teams/operatives

inspect support and specialist capacity

move to operations or procurement

plan upgrades or institutional adjustments

Should not contain

detailed mission board as the main content

full tactical incident details

long-form report browsing

#### 3.2 Operations

Purpose

Operations is the mission triage and deployment surface.

This is where the player answers:

what requires attention this week?

what is worth responding to now?

which team should go where?

what will happen if we delay?

Displays

incoming incidents

contracts

active missions

severity / urgency indicators

readiness implications

deployment warnings

projected support strain

expected bottlenecks

Primary actions

triage incidents

route missions

assign teams

inspect mission details

deploy or defer

Subviews

incident list

mission details

deployment confirmation

active mission status

Should not contain

deep procurement browsing

hub rumor browsing as the primary content

broad agency progression trees

#### 3.3 Hub

Purpose

The hub is the opportunity and information surface between operations.

This is where the player answers:

what rumors, leads, services, or social openings exist?

which factions are present?

what partial information is worth acting on?

what opportunities exist beyond direct incident response?

Displays

rumors

leads

social or service opportunities

faction presence

district/service-node highlights if implemented

partial/misleading information signals

Primary actions

inspect surfaced opportunities

convert leads into actionable work where applicable

assess faction-related access or risk

move from hub opportunity into operations routing when appropriate

Should not contain

free-roam navigation

broad dialogue-tree play

duplicated incident list unless tightly integrated

#### 3.4 Procurement

Purpose

The procurement screen handles gear/equipment acquisition and relevant resource pressure.

This is where the player answers:

what can we buy, repair, or replace?

what is blocked by funding or market state?

what gear bottlenecks are affecting readiness?

Displays

available gear

costs

shortages / market constraints

maintenance/recovery implications

equipment state summaries

Primary actions

purchase

replace

inspect costs and constraints

review key equipment bottlenecks

Should not contain

general agency overview

mission deployment workflow

long-form reports

#### 3.5 Reports

Purpose

Reports summarize what happened and why.

This is where the player answers:

what happened this week?

why did those outcomes occur?

which pressures or bottlenecks mattered?

what changed for next week?

Displays

weekly headline summary

resolved / partial / failed mission summaries

surfaced report notes

fallout summaries

bottleneck explanations

pressure changes

support / specialist / coordination explanations

Primary actions

review latest week

browse prior reports

inspect cause summaries

jump from report items to relevant agency or operations surfaces

Should not contain

complex editing / planning controls

primary incident routing

procurement browsing

#### 3.6 Reference

Purpose

Reference is a bounded information lookup surface.

This may include:

known factions

discovered sites

known tags/conditions

glossary-like in-game information

compendium-style knowledge state

Displays

discovered information only

partial or confidence-marked entries where relevant

Primary actions

inspect known entities

cross-reference prior discoveries

understand persistent world knowledge

Should not contain

core week actions

deployment decisions

duplicated report summaries as the primary feature

### 4. Main player flows

#### 4.1 Weekly planning flow

Reports (review last week)
-> Agency (check condition and bottlenecks)
-> Operations (triage and route work)
-> Procurement (fix key gear problems if needed)
-> Agency / Operations (confirm readiness)
-> Advance Week
-> Reports

This is the most common loop.

#### 4.2 Opportunity-led flow

Hub
-> inspect rumor / lead
-> convert to actionable path if relevant
-> Operations
-> assign team / route response
-> Advance Week
-> Reports

Use when hub-generated opportunities matter as much as direct incident intake.

#### 4.3 Recovery-led flow

Reports
-> notice specialist/support/equipment bottleneck
-> Agency
-> inspect recovery/support state
-> Procurement or support-facing action
-> return to Operations
-> adjust plans based on constrained capacity

Use when fallout from prior weeks dominates planning.

### 5. Screen adjacency map

Agency <-> Operations
Agency <-> Procurement
Agency <-> Reports
Operations <-> Hub
Operations <-> Reports
Hub <-> Reports
Procurement <-> Agency
Reports <-> all major screens through contextual links

Recommended jump behavior

From report notes, the player should be able to jump directly to:

a team

a mission/incident

a procurement bottleneck

a support/specialist bottleneck

a hub opportunity source

This reduces friction and reinforces legibility.

### 6. Screen-by-screen information hierarchy

Agency hierarchy

critical bottlenecks

team readiness / recovery

support and specialist state

funding / legitimacy / standing

facilities and long-horizon upgrades

Operations hierarchy

critical incidents and urgent items

routable opportunities

readiness / support warnings

mission details

projected outcomes / risks

Hub hierarchy

actionable opportunities

rumors / leads

faction presence

district/service variance

ambient flavor or secondary detail

Procurement hierarchy

blocking gear shortages

replacements / recovery-related needs

affordability

broader equipment browsing

Reports hierarchy

major results

why they happened

fallout

next-week implications

### 7. Recommended interaction patterns

Pattern A — Summary -> detail -> action

Default pattern across most screens.

Example:

see support bottleneck summary

click into support detail

take corrective action

Pattern B — Surface warning -> linked destination

Warnings should be actionable.

Example:

“maintenance bottleneck delayed recovery”

click -> procurement or agency support detail

Pattern C — Compare before commit

For deployment and routing:

show the player enough information to compare options

do not hide obvious bottlenecks until after commitment

Pattern D — Reports as explanation, not control

Reports should explain outcomes and link to causes, but not become the primary control surface.

### 8. Advance Week action placement

Rule

Advance Week should always be easy to find but hard to trigger accidentally.

Recommended placement:

persistent bottom-right primary action

disabled or warned when major unresolved routing or blocking states exist, if appropriate

Before advancing

Show summary confirmation:

unresolved urgent incidents

idle teams

support overload risk

key recovery/specialist bottlenecks

expected pressure carryover if obvious

This preserves player agency without over-warning.

### 9. Wireframe sketches

#### 9.1 Agency screen

+-----------------------------------------------------------+
| Agency Summary                                            |
| Funding | Legitimacy | Standing | Support | Overload      |
+----------------------+------------------------------------+
| Teams / Recovery     | Bottlenecks                        |
| - Team A ready       | - Support strained                 |
| - Team B injured     | - Maintenance bottleneck           |
| - Team C idle        | - Funding pressure                 |
+----------------------+------------------------------------+
| Facilities           | Specialist / Support status        |
| - Med bay II         | - support available: 2             |
| - Training room I    | - maintenance specialists: 1       |
+----------------------+------------------------------------+

#### 9.2 Operations screen

+-----------------------------------------------------------+
| Operations                                                |
+----------------------+------------------------------------+
| Incident list        | Selected incident                  |
| - Critical case      | severity                           |
| - Contract           | escalation                         |
| - Lead conversion    | recommended team                   |
|                      | readiness warnings                 |
|                      | support/specialist warnings        |
|                      | deploy / defer                     |
+----------------------+------------------------------------+

#### 9.3 Hub screen

+-----------------------------------------------------------+
| Hub                                                       |
+----------------------+------------------------------------+
| Opportunities        | Selected rumor / lead              |
| - rumor              | source                             |
| - lead               | confidence                         |
| - service            | faction presence                   |
|                      | possible action path               |
+----------------------+------------------------------------+

#### 9.4 Reports screen

+-----------------------------------------------------------+
| Weekly Report                                           |
+-----------------------------------------------------------+
| Headline summary                                        |
| - 2 incidents resolved                                  |
| - 1 partial containment                                 |
| - support shortage degraded follow-through              |
+-----------------------------------------------------------+
| Notes                                                   |
| - coordination overload reduced follow-through          |
| - maintenance bottleneck delayed recovery               |
| - legitimacy loss after collateral spillover            |
+-----------------------------------------------------------+
| Resolved | Partial | Failed                             |
+-----------------------------------------------------------+

### 10. Navigation anti-patterns to avoid

Anti-pattern 1: Deep menu trees

The player should not click through 4–5 layers to reach core weekly decisions.

Anti-pattern 2: Duplicated mission state across screens

Operations should own mission triage and routing.
Other screens can reference, not duplicate.

Anti-pattern 3: Hub bloat

The hub should not become a separate free-roam or narrative-navigation layer.

Anti-pattern 4: Hidden bottlenecks

A player should not need to infer critical overload states from scattered UI fragments.

Anti-pattern 5: Report isolation

If reports explain a problem but do not let the player reach the affected system quickly, navigation is failing.

### 11. MVP navigation

For MVP, the game can ship with:

Agency

Operations

Procurement

Reports

Hub and Reference can remain lighter if needed, as long as:

opportunities still surface

routing still works

the player can understand and act on campaign state

### 12. Full navigation target

A fuller version should support:

strong agency overview

fast mission triage and deployment

bounded but alive hub opportunities

robust reports

contextual jumps between explanation and action

a shell that continuously reflects institutional condition

### 13. Summary

Containment Protocol navigation should make the player feel like they are:

reviewing a pressured organization

making bounded, informed strategic choices

moving cleanly from problem -> diagnosis -> action -> consequence

The navigation map should reinforce the weekly institutional loop, not compete with it.
