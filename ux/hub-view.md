# Containment Protocol — Hub View Spec

## Purpose

This document defines the Hub view for Containment Protocol.

The Hub view is the player-facing surface for socially filtered information, rumors, leads, contracts, services, district behavior, and faction presence between deployments.

It is where the player reviews:

- rumors
- leads
- contracts
- faction-linked opportunities
- service access
- district conditions
- filtered or misleading signals

This is not the main mission-routing screen and not the Agency institutional overview.

The Hub view is the campaign’s social and informational staging surface.

This spec is for:

- UX design
- wireframing
- interaction design
- hub simulation integration
- implementation planning
- QA validation

---

## Design goals

The Hub view should:

- make the world feel reactive and socially mediated
- surface opportunities that emerge from campaign state
- distinguish rumor, lead, contract, and service patterns clearly
- preserve uncertainty without becoming vague
- create meaningful pre-routing interpretation work
- reflect faction presence, district behavior, and legitimacy conditions
- remain bounded and easy to scan

The Hub view should not:

- become a free-roam city layer
- duplicate Mission Triage
- become a dialogue-tree RPG screen
- bury useful signals in flavor clutter
- require aimless browsing to find core opportunities

---

## 1. Core player questions

The Hub view should answer:

1. What is surfacing in the world right now?
2. Which signals are credible, partial, or misleading?
3. What opportunities exist beyond direct incident intake?
4. Which factions or districts are currently shaping opportunity quality?
5. What looks worth recon, conversion, or follow-up?
6. What is changing in the social or operational environment?

If the player cannot answer those quickly, the view is failing.

---

## 2. What belongs in the Hub view

The Hub view is where the player reviews non-mission-board opportunity signals that emerge from campaign state.

This may include:

- rumors
- leads
- contracts
- services
- district signals
- faction presence changes
- opportunity-access shifts
- low-intensity operational openings
- socially filtered information

It should represent “what the world is surfacing” rather than “all work already routed for action.”

---

## 3. Recommended layout

```text
+------------------------------------------------------------------+
| Status Bar / Pressure Strip                                      |
| Week | Legitimacy | Faction Presence | District Alerts           |
+------------------------------------------------------------------+

| Hub Filters / Tabs                                               |
| All | Rumors | Leads | Contracts | Services | Districts          |
+-----------------------------+------------------------------------+

| Hub List                    | Selected Item Detail               |
| - rumor                     | title                              |
| - lead                      | source                             |
| - contract                  | reliability / filtering            |
| - service                   | district / faction context         |
| - district signal           | why it matters                     |
|                             | possible action path               |
|                             | time sensitivity                   |
|                             | convert / track / ignore           |
+-----------------------------+------------------------------------+

| Context Footer                                                   |
| faction influence | legitimacy filter | active district pressure  |
+------------------------------------------------------------------+
```

---

## 4. Information hierarchy

### Highest priority

These should be easiest to see:

- actionable leads and contracts
- rumor reliability / confidence
- faction or district influence
- likely relevance or opportunity value
- legitimacy or access filtering
- time sensitivity if present

### Medium priority

These should stay visible but secondary:

- source profile
- district context
- opportunity category
- service availability
- recent local change

### Lower priority

These can live in drilldowns:

- deep history
- extended source lore
- broad encyclopedic faction description
- low-value ambient text

The Hub should preserve texture without sacrificing usefulness.

---

## 5. Main screen sections

### 5.1 Hub list

#### Purpose — Hub list

Present surfaced opportunities and signals in a scan-friendly list.

#### Each row should show — Hub list

- title
- type
- reliability state
- source or district if useful
- one key implication
- faction sensitivity or access note if relevant

#### Example row — Hub list

Night Traffic Avoiding Old Bridge
Rumor • Partial • Old Bridge
Signal: recon-worthy infrastructure risk

Brokered Clinic Retrieval
Contract • Clear • Faction-linked
Signal: low-visibility opportunity

#### Design rule — Hub list

The player should be able to distinguish immediately between:

- actionable
- uncertain
- filtered
- faction-shaped
- low-value for now

### 5.2 Selected item detail panel

#### Purpose — Selected item detail panel

Show the currently selected rumor, lead, contract, service, or district signal in more detail.

#### Should display — Selected item detail panel

- title
- type
- source profile
- reliability / filtering state
- short surfaced text
- district or faction context
- implied opportunity or risk
- possible action path
- time sensitivity if relevant

#### Example structure — Selected item detail panel

Title
Type / source
Rumor or opportunity text
Reliability
District / faction context
Why it matters
Possible action

#### Design rule — Selected item detail panel

The detail panel should help the player interpret, not overexplain hidden truth.

### 5.3 Filters and tabs

#### Purpose — Filters and tabs

Reduce clutter and support comparison.

#### Suggested tabs — Filters and tabs

- All
- Rumors
- Leads
- Contracts
- Services
- Districts

#### Suggested filters — Filters and tabs

- clear
- partial
- misleading
- faction-linked
- legitimacy-sensitive
- recon-worthy
- time-sensitive
- district-specific

#### Design rule — Filters and tabs

Filtering should support decision quality, not create menu bureaucracy.

### 5.4 Context footer / strip

#### Purpose — Context footer / strip

Keep the Hub grounded in current campaign conditions.

#### May display — Context footer / strip

- active faction influence
- legitimacy filtering pressure
- district instability
- service restrictions
- current rumor density or opportunity pressure

#### Example — Context footer / strip

Faction influence: high in dockside
Legitimacy filtering: moderate
District pressure: rising in river district

#### Design rule — Context footer / strip

This should explain why the Hub looks the way it does.

---

## 6. Item categories

The Hub view should visually distinguish item types clearly.

### 6.1 Rumor

A low-confidence surfaced signal.

Player expectation

- partial information
- source bias possible
- may justify recon or monitoring
- not yet a clean operational directive

### 6.2 Lead

A stronger, more actionable signal.

Player expectation

- higher value than rumor
- still not full certainty
- likely convertible into operational work

### 6.3 Contract

A structured request or opportunity.

Player expectation

- explicit source
- clearer value or obligation framing
- stronger faction/economy implications

### 6.4 Service

A bounded non-mission resource or access path.

Player expectation

- utility to the agency
- access may be filtered by legitimacy or faction posture
- often supports planning rather than direct deployment

### 6.5 District signal

A place-bound indication of local instability, pressure, or opportunity pattern.

Player expectation

- broader context
- may shape future rumors, leads, or incidents
- useful for interpreting local change

---

## 7. Reliability surfacing

Reliability must be legible.

Useful reliability states:

- Clear
- Partial
- Misleading

The player should be able to tell whether an item is:

- broadly trustworthy
- directionally useful but incomplete
- plausible but skewed

This should never require reading hidden debug detail.

---

## 8. Faction and legitimacy visibility

The Hub is one of the main places faction and legitimacy should become visible.

Examples:

- a faction-linked contract appears because relationship improved
- rumor quality worsens because district actors are suspicious
- a service path becomes filtered under low legitimacy
- a district’s opportunities shift because rival presence increased

The view should surface these as causes, not as invisible modifiers.

---

## 9. Good surfaced text patterns

Good examples

Market carriers are quietly avoiding the old bridge route after dusk.

Broker access is narrower this week under current legitimacy pressure.

Faction support improved the clarity of this contract.

Local reports conflict, but the signal is strong enough to justify recon.

Bad examples

Strange things are happening everywhere.

Conditions are unclear.

The district feels uneasy.

Something may be going on.

The Hub needs high-signal, bounded wording.

---

## 10. Interaction patterns

### Pattern A — scan -> interpret -> convert

Primary Hub flow:

- scan surfaced items
- interpret reliability and source
- decide whether to convert, track, or ignore

### Pattern B — hub to triage

A player reviews a lead or contract here, then sends it into Mission Triage or operational planning.

### Pattern C — report to hub

A player sees in the weekly report that visibility or faction posture changed, then checks the Hub to see how social or opportunity surfaces have shifted.

---

## 11. Common actions

Useful actions from the Hub:

- Convert to lead
- Route to triage
- Track
- Ignore
- Inspect district context
- Inspect faction context
- Open related report or prior signal

### Design rule — Common actions

The Hub should support interpretation and conversion, not immediate tactical commitment.

---

## 12. What should not live here

Do not make the Hub view:

- a duplicate incident board
- a free-roam city screen
- a faction encyclopedia by default
- a dialogue-first RPG layer
- a giant archive of every rumor ever surfaced

It is the bounded social/informational opportunity surface.

---

## 13. Example wireframe content

Hub List

Night Traffic Avoiding Old Bridge
Rumor • Partial • Old Bridge
Recon-worthy infrastructure signal

Brokered Clinic Retrieval
Contract • Clear • Faction-linked
Low-visibility retrieval opportunity

Port Inspectors Quietly Withdrawing
Lead • Partial • Dockside
Possible access degradation after dark

Selected Item

Night Traffic Avoiding Old Bridge

Rumor • Market carriers
Reliability: Partial
District: Old Bridge

Several market carriers are quietly avoiding the old bridge route after dusk. Most describe “machinery” in the fog, though no transit blockage has been formally logged.

Why it matters:

- may indicate a low-visibility infrastructure-adjacent anomaly
- may justify recon before logistics degrade
- may also reflect socially amplified district fear

Actions:

[Track] [Convert to lead] [Ignore]

---

## 14. UX validation questions

A tester using this screen should be able to answer in under 10 seconds:

- what looks actionable?
- what is uncertain but interesting?
- what is likely distorted?
- which faction or district is shaping this item?
- what can be safely ignored for now?

If they cannot, the Hub is too noisy or too vague.

---

## 15. Acceptance criteria

The Hub view is complete when:

- rumors, leads, contracts, and services are clearly distinguishable
- reliability and filtering are visible
- faction and legitimacy effects are legible
- the player can identify meaningful opportunity without excessive browsing
- the view links cleanly into triage, district context, or faction context
- the Hub feels reactive, bounded, and strategically useful

---

## 16. Summary

The Hub view should feel like the world talking back to the agency through incomplete, socially filtered signals.

It should answer:

- what is surfacing?
- how much should I trust it?
- what does it open up?
- what kind of world pressure is forming around us?

The player should feel:

the world is offering signals, not answers, and reading them well is part of running the agency.
