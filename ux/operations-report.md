# Containment Protocol — Operations Report View Spec

## Purpose

This document defines the Operations Report view for Containment Protocol.

The Operations Report view is the player-facing explanation layer for weekly outcomes, mission results, bottlenecks, fallout, and strategic carryover.

It is where the player answers:

- what happened?
- why did it happen?
- what changed?
- what now constrains the agency?
- what should be accounted for next week?

This view is not the same as Mission Triage and not the same as the Agency overview.

Mission Triage answers:

- what should we do?

Agency answers:

- what can we sustain?

Operations Report answers:

- what just happened, why, and what does it mean now?

This spec is for:

- UX design
- interaction design
- report/system integration
- implementation planning
- surfacing logic design
- QA validation

---

## Design goals

The Operations Report view should:

- explain outcomes clearly and causally
- surface the few most important bottlenecks
- connect mission results to institutional consequences
- make next-week constraints legible
- support quick scanning first and detail drilldown second
- reinforce deterministic, systems-first understanding
- preserve continuity between weeks

The Operations Report view should not:

- become a prose-heavy postmortem archive
- bury the main causes under low-value activity logs
- duplicate the full Agency view
- become the primary control surface for planning
- explain outcomes in vague or theatrical language

---

## 1. Core player questions

The Operations Report view should answer:

1. What resolved cleanly, partially, or badly?
2. What were the main causes?
3. Which bottlenecks mattered most?
4. What fallout or pressure is still active?
5. What is now damaged, delayed, escalated, or harder?
6. What should I take into next week’s planning?

If the player cannot answer those quickly, the view is failing.

---

## 2. What the Operations Report view is

The Operations Report view is the player-facing summary and explanation surface for a completed weekly step or bounded operational phase.

It includes:

- headline summary
- major outcomes
- causal report notes
- fallout and pressure changes
- recovery and bottleneck carryover
- links into the systems affected

It does not include:

- deep mission configuration
- primary deployment decisions
- full historical analytics dashboards
- hidden simulation internals
- duplicated planning workflow

---

## 3. Report view philosophy

The report should explain state transitions, not merely restate results.

Preferred pattern:

```text
Mission and campaign outcomes

-> identify strongest causes

-> surface key bottlenecks

-> show persistent fallout

-> connect to next-week planning
```

The player should leave the report with a stronger mental model of how the institution behaves under pressure.

---

## 4. Recommended layout

```text
+------------------------------------------------------------------+
| Status Bar / Pressure Strip                                      |
| Week Complete | Funding | Legitimacy | Active Pressure           |
+------------------------------------------------------------------+

| Headline Summary                                                  |
| 1–3 sentence overview of the week                                |
+------------------------------------------------------------------+

| Major Outcomes                | Key Report Notes                |
| - clean resolutions           | - support shortage degraded     |
| - partial outcomes            | - maintenance bottleneck delay  |
| - failed or escalated items   | - visibility increased pressure |
+------------------------------+-----------------------------------+

| Fallout / Pressure Changes    | Recovery / Bottlenecks          |
| - legitimacy loss             | - operative recovery queue      |
| - district visibility rise    | - equipment recovery delay      |
| - faction friction            | - support strain next week      |
+------------------------------+-----------------------------------+

| Linked Details                                                    |
| missions | incidents | affected teams | related bottlenecks       |
+------------------------------------------------------------------+

| Actions                                                           |
| [Go to Agency] [Go to Triage] [Inspect mission]                   |
+------------------------------------------------------------------+
```

---

## 5. Main sections

### 5.1 Headline summary

#### Purpose — Headline summary

Provide an immediate week-level understanding of what changed.

#### Should display — Headline summary

- 1–3 sentence summary
- overall weekly shape
- biggest bottleneck if it mattered
- most important persistent consequence if relevant

#### Good example — Headline summary

Two operations resolved this week, but one degraded under support strain. Recovery demand remains elevated, and district visibility increased after a partial containment.

#### Design rule — Headline summary

The headline should summarize the week, not dramatize it.

### 5.2 Major outcomes

#### Purpose — Major outcomes

Show the most important result categories first.

#### Should display — Major outcomes

- incidents resolved
- partial outcomes
- failed or escalated results
- major carryover changes
- bounded counts or grouped results

#### Example items — Major outcomes

1 incident resolved cleanly

1 operation ended in partial containment

1 district visibility state worsened

1 equipment recovery job carried into next week

#### Design rule — Major outcomes

This should be scannable and concrete.

### 5.3 Key report notes

#### Purpose — Key report notes

Surface the strongest causes behind important outcomes.

#### Should display — Key report notes

- short causal notes
- one meaningful cause per note
- most important notes first

#### Good examples — Key report notes

Support shortage degraded clean follow-through.

Maintenance bottleneck delayed full equipment recovery.

Escalation pressure increased local hostility before deployment.

Legitimacy pressure narrowed clean response options.

Recon gaps increased avoidable exposure.

#### Design rule — Key report notes

This is one of the most important sections in the entire view.

### 5.4 Fallout and pressure changes

#### Purpose — Fallout and pressure changes

Show what new burdens, risks, or strategic consequences now exist.

#### Should display — Fallout and pressure changes

- pressure changes
- faction or legitimacy effects
- district or visibility shifts
- persistent fallout
- next-week burden indicators

#### Good examples — Fallout and pressure changes

Civilian visibility increased in the river district.

Support strain remains active next week.

Recovery burden remains elevated for one team.

Faction suspicion increased after public containment failure.

#### Design rule — Fallout and pressure changes

This section should focus on durable consequence, not every transient detail.

### 5.5 Recovery / bottleneck summary

#### Purpose — Recovery / bottleneck summary

Translate operational results into institutional constraints.

#### Should display — Recovery / bottleneck summary

- operative recovery summary
- equipment recovery summary
- specialist bottlenecks
- support bottlenecks
- replacement pressure where relevant

#### Example items — Recovery / bottleneck summary

1 operative remains in recovery

2 equipment items await repair

maintenance bottleneck delayed one recovery job

support availability remains below projected concurrent load

#### Design rule — Recovery / bottleneck summary

The player should be able to read this section and know what to check next in Agency.

### 5.6 Linked details

#### Purpose — Linked details

Support drilldown without overloading the main report.

#### Should link to — Linked details

- affected missions
- affected incidents
- affected teams
- bottleneck context
- relevant agency surfaces

#### Design rule — Linked details

The report should explain first, then let the player inspect.

---

## 6. Information hierarchy

### Highest priority

These must be near the top:

- major outcomes
- strongest causal notes
- active fallout
- current bottlenecks
- next-week constraints

### Medium priority

These should remain visible but secondary:

- source mission links
- district/faction context
- historical comparison
- lower-severity note detail

### Lower priority

These can be drilldown only:

- complete event trace
- low-value transitional notes
- deep debug-style metadata

---

## 7. Report note ordering rules

The report should prioritize:

- mission failures or meaningful partials
- support/specialist bottlenecks
- escalation or legitimacy shifts
- recovery and replacement carryover
- successful relief or stabilization signals

This prevents noise from outranking decision-relevant information.

---

## 8. Good report wording

The view should use:

- concise
- causal
- institutional
- low-flavor
- mechanically legible language

### Good examples — Good report wording

Support shortage degraded clean follow-through.

Recovery delay reduced next-week readiness.

Visibility costs increased legitimacy pressure.

Faction support improved contract quality this week.

### Bad examples — Good report wording

Things became more difficult.

The operation took an unfortunate turn.

The brave team paid for its courage.

Conditions worsened across several dimensions.

Warnings and explanations should name causes when known.

---

## 9. Drilldown behavior

### Mission drilldown

Should show:

- mission result
- follow-through quality
- main cause
- fallout
- linked team/incident context

### Bottleneck drilldown

Should show:

- source cause
- current consequence
- likely next-week effect
- relevant agency action path

### Recovery drilldown

Should show:

- personnel/equipment still constrained
- specialist or support blockers
- likely return timing if the system supports it

### Rule — Drilldown behavior

Drilldowns should move the player from understanding to action.

---

## 10. Relationship to other views

### Agency

The report should often push the player toward Agency after revealing bottlenecks.

### Mission Triage

The report should often push the player toward Triage after revealing carryover pressure.

### Hub

The report may link indirectly when fallout changes rumor quality, access, or faction presence.

### Procurement

The report should link there only when a real equipment or recovery bottleneck is involved.

---

## 11. Example report flow

Example:

one mission resolves cleanly

one mission resolves partial

support shortage causes degraded follow-through

maintenance bottleneck delays equipment recovery

district visibility rises after incomplete containment

The report should show:

- weekly summary
- grouped outcomes
- causal notes:
  - Support shortage degraded clean follow-through.
  - Maintenance bottleneck delayed full equipment recovery.
- fallout:
  - district visibility increased
  - recovery burden remains elevated
- next links:
  - Agency
  - affected mission
  - recovery bottleneck

This is the desired pattern: explanation before planning.

---

## 12. What should not live here

Do not make the Operations Report view:

- a full planning screen
- a large undifferentiated event log
- a narrative cutscene substitute
- a second Agency dashboard
- a long prose chronicle of every operation

It is a summary and explanation surface.

---

## 13. Example wireframe content

Headline Summary

Two operations resolved this week, but only one completed cleanly. Support strain and delayed recovery reduced follow-through quality and left one district under elevated visibility pressure.

Major Outcomes

1 incident resolved cleanly

1 operation ended in partial containment

1 district visibility state worsened

1 equipment recovery job carried into next week

Key Report Notes

Support shortage degraded clean follow-through.

Maintenance bottleneck delayed full equipment recovery.

Escalation pressure increased local hostility before deployment.

Fallout / Pressure Changes

Civilian visibility increased in the river district.

Recovery burden remains elevated for one team.

Support strain is still active.

Recovery / Bottlenecks

maintenance specialist capacity did not clear all recovery demand

support availability remains below projected concurrent load

Actions

Go to Agency

Inspect affected mission

Review next-week triage

---

## 14. UX validation questions

A tester using this view should be able to answer in under 10 seconds:

- what happened this week?
- why did the important bad result happen?
- what bottleneck mattered most?
- what is still a problem now?
- where should I go next to act on it?

If they cannot, the report hierarchy is wrong.

---

## 15. Acceptance criteria

The Operations Report view is complete when:

- major outcomes are immediately understandable
- causal notes explain the main results
- fallout and pressure changes are visible
- current bottlenecks are obvious
- the view links cleanly into Agency, Triage, or affected entities
- the player can infer better next-week decisions from the report

---

## 16. Summary

The Operations Report view should make the player feel like they are reviewing the agency’s last week with enough clarity to learn from it.

It should answer:

- what happened?
- why?
- what did it cost?
- what now matters most?

The player should feel:

the institution remembers what happened, and I understand how this week changed the next one.
