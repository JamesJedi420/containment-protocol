# Containment Protocol — Deployment Flow Spec

## Purpose

This document defines the Deployment flow for Containment Protocol.

The Deployment flow is the step between mission triage and mission resolution where the player commits agency resources to an operational response.

It is where the player:

- selects a response path
- assigns a team
- confirms readiness
- checks support and specialist constraints
- reviews likely bottlenecks
- accepts the cost of commitment

This is not the same as mission triage and not the same as mission resolution.

Mission Triage answers:

- should we do this?

Deployment answers:

- can we do this cleanly, and what happens if we commit now?

This spec is for:

- UX design
- interaction design
- system integration
- implementation planning
- warning/projection design
- QA validation

---

## Design goals

The Deployment flow should:

- make commitment feel deliberate
- show the operational cost of acting now
- surface team, support, and specialist constraints clearly
- distinguish viable deployment from reckless deployment
- preserve deterministic legibility
- connect preparation quality to later mission outcomes
- remain fast enough to support weekly planning

The Deployment flow should not:

- become a tactical combat setup screen
- hide critical warnings until after commitment
- require deep roster micromanagement for basic use
- duplicate the full Agency view
- bury the player under low-value configuration detail

---

## 1. Core player questions

The Deployment flow should answer:

1. Which team should take this mission?
2. Is the selected team actually ready?
3. What are the main operational risks?
4. Is support capacity sufficient for this commitment?
5. Are specialist, gear, recon, or legitimacy constraints likely to degrade follow-through?
6. Should I deploy now, adjust the plan, or back out?

If the player cannot answer those quickly, the flow is failing.

---

## 2. What deployment is

Deployment is the bounded commitment step that turns a planned response into an active operational assignment.

Deployment includes:

- mission assignment
- team selection
- readiness review
- requirement checks
- warning surfacing
- commitment confirmation

Deployment does not include:

- broad weekly prioritization
- post-mission explanation
- tactical movement or encounter play
- procurement as the main task
- long-form report reading

---

## 3. Deployment flow philosophy

Deployment should make institutional condition visible at the exact moment the player commits.

Preferred pattern:

```text
Planned mission

-> select team

-> validate readiness / role coverage / key requirements

-> surface support / specialist / legitimacy / recon warnings

-> show likely commitment risk

-> confirm deployment or revise plan
```

The flow should feel like an operations board commit step, not a cinematic launch sequence.

---

## 4. Recommended layout

```text
+------------------------------------------------------------------+
| Status Bar / Pressure Strip                                      |
| Week | Support | Legitimacy | Active Warnings                    |
+------------------------------------------------------------------+

| Mission Summary                                                   |
| title | type | urgency | escalation if delayed | key objective   |
+------------------------------------------------------------------+

| Team Selection                | Deployment Assessment            |
| - Team A                      | readiness                        |
| - Team B                      | role coverage                    |
| - Team C                      | support demand                   |
|                               | specialist constraints           |
|                               | recon / info quality             |
|                               | likely bottlenecks              |
+------------------------------+-----------------------------------+

| Risk / Warning Panel                                              |
| - support shortage likely                                         |
| - missing certification                                           |
| - recovery burden will increase                                   |
| - legitimacy-sensitive deployment                                 |
+------------------------------------------------------------------+

| Actions                                                           |
| [Deploy] [Adjust team] [Back to triage] [Open agency context]     |
+------------------------------------------------------------------+
```

---

## 5. Main sections

### 5.1 Mission summary

#### Purpose — Mission summary

Restate the committed mission clearly enough that the player knows what is being deployed.

#### Should display — Mission summary

- mission title
- mission type
- source or district if useful
- short objective
- urgency / severity
- escalation if delayed

#### Design rule — Mission summary

This should be compact. The player is here to commit, not reread the entire mission spec.

### 5.2 Team selection panel

#### Purpose — Team selection panel

Show which teams are available and how suitable they are.

#### Each team row should show — Team selection panel

- team name
- deployment status
- readiness state
- one key warning or strength
- availability this week
- rough fit if the system supports it

#### Example row — Team selection panel

Team A — Ready — strong coverage — available now

Team B — Degraded — trauma burden — high risk

Team C — Recovering — unavailable

#### Design rule — Team selection panel

The player should not need to open a deep team sheet just to know whether a team is a plausible choice.

### 5.3 Deployment assessment panel

#### Purpose — Deployment assessment panel

Show what changes when the selected team is paired with the selected mission.

#### Should display — Deployment assessment panel

- readiness
- role coverage
- key certification or requirement checks
- support burden
- specialist sensitivity
- recon / information quality if relevant
- likely bottleneck
- projected deployment quality

#### Example assessment outputs — Deployment assessment panel

readiness sufficient

recon incomplete

support-sensitive under current load

maintenance bottleneck may delay clean recovery

missing coverage increases exposure risk

#### Design rule — Deployment assessment panel

This panel should explain the major operational shape without pretending to predict exact narrative outcome.

### 5.4 Risk / warning panel

#### Purpose — Risk / warning panel

Surface the main reasons deployment may degrade.

#### Good warnings — Risk / warning panel

Support shortage likely under current load

No certified operative assigned

Recon gap increases exposure risk

Recovery burden will remain active next week

Low legitimacy narrows clean response options

Coordination overload risk under concurrent deployment

#### Bad warnings — Risk / warning panel

This may be difficult

Some systems may be affected

Risk level uncertain

#### Design rule — Risk / warning panel

Warnings should be causal, specific, and actionable.

### 5.5 Actions

#### Primary actions — Actions

- Deploy
- Adjust team
- Back to triage

#### Secondary actions — Actions

- Open agency context
- Inspect team detail
- Review source lead or incident
- Open procurement only if a specific blocking issue exists

#### Design rule — Actions

The primary action area should make commitment clear without encouraging accidental deployment.

---

## 6. Core checks before deployment

The Deployment flow should validate and/or surface:

### 6.1 Team availability

Questions:

- is the team idle, assigned, deployed, or recovering?
- is the team actually selectable?

### 6.2 Readiness

Questions:

- is readiness strong, acceptable, weak, or critical?
- is the team viable now?

### 6.3 Role and certification coverage

Questions:

- does the team meet essential mission needs?
- are there obvious critical gaps?

### 6.4 Support capacity

Questions:

- does current support allow clean follow-through?
- will this deployment likely trigger shortage?

### 6.5 Specialist bottlenecks

Questions:

- does this mission rely on a constrained specialist lane?
- will post-mission throughput degrade?

### 6.6 Recon / information quality

Questions:

- is the player deploying with enough useful information?
- is uncertainty itself a major risk?

### 6.7 Legitimacy / faction sensitivity

Questions:

- is this a clean window for intervention?
- will visible deployment carry unusual external cost?

---

## 7. Deployment outcomes at this stage

The Deployment flow should not fully resolve the mission, but it should classify commitment posture in a bounded way.

Useful pre-resolution states:

- viable
- viable with clear degradation risk
- high-risk but deployable
- blocked
- blocked unless adjusted

This supports player understanding without revealing exact downstream results.

---

## 8. Adjustment paths

If deployment looks weak, the player should be able to adjust without friction.

Useful adjustment paths:

- switch teams
- back out to triage
- inspect agency bottleneck
- inspect team detail
- open procurement if a loadout blocker matters
- accept risk and deploy anyway

The flow should support revision, not trap the player.

---

## 9. Difference between “Route now” and “Deploy”

This distinction should remain clear.

Route now means:

- commit the mission to this week’s plan

Deploy means:

- assign a team and activate the operation

This is important because the player often decides:

- yes, this work matters
- now decide whether the agency can execute it cleanly

---

## 10. Good surfaced signals

The Deployment flow should expose signals such as:

- clean deployment likely
- degraded follow-through risk
- support-sensitive commitment
- escalation pressure if delayed
- low readiness operative in critical role
- recovery burden likely after completion
- high visibility cost under current legitimacy

These should teach the player how systems connect.

---

## 11. What should not live here

Do not make the Deployment flow:

- a tactical loadout micro-screen by default
- a full team management replacement
- a second mission triage board
- a hidden simulation debugger
- a dramatic cutscene layer

It is the operational commit step.

---

## 12. Example flow

Example:

player selects Unresponsive Freight Archive

player chooses Team A

deployment assessment shows:

- readiness acceptable
- recon incomplete
- support-sensitive under current load
- public visibility rising

warning panel shows:

- support shortage likely if another mission is also deployed
- recon gap increases exposure risk

player chooses:

- Deploy now
- or back out and route a lower-cost mission first

This is the intended behavior: visible tradeoff at the moment of commitment.

---

## 13. UX validation questions

A tester using this flow should be able to answer in under 10 seconds:

- can this team go?
- what is the main risk?
- what is the bottleneck?
- is this risk coming from the mission, the agency, or both?
- should I commit now or revise the plan?

If they cannot, the flow is too opaque.

---

## 14. Acceptance criteria

The Deployment flow is complete when:

- the player can select a team quickly
- key readiness and coverage checks are visible
- support and specialist risks are understandable
- commitment feels distinct from triage
- obvious blockers are surfaced before deployment
- the player can revise the plan without friction
- the screen teaches why a deployment is clean, degraded, or reckless

---

## 15. Summary

The Deployment flow should feel like signing off on an operation with full awareness of the institution behind it.

It should answer:

- can we do this?
- can we do it cleanly?
- what is the real bottleneck?
- what are we accepting if we commit now?

The player should feel:

this is the point where planning becomes consequence.
