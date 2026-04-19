# Containment Protocol — Procurement and Support View Spec

## Purpose

This document defines the Procurement and Support view for Containment Protocol.

This view is the player-facing screen for managing gear availability, recovery-related procurement, support-facing capacity risks, and agency-side throughput constraints that affect operational readiness.

It is where the player checks:

- current procurement options
- blocked or degraded gear availability
- replacement needs
- recovery-linked supply constraints
- support-sensitive bottlenecks
- whether institutional capacity can absorb planned work cleanly

This is not the main mission-routing screen and not the full Agency overview.

The Procurement and Support view is the “what can we equip, restore, and sustain?” screen.

This spec is for:

- UX design
- wireframing
- interaction design
- procurement/support system integration
- implementation planning
- QA validation

---

## Design goals

The Procurement and Support view should:

- make resource and loadout bottlenecks legible
- show what is blocked by funding, market state, recovery, or support strain
- connect acquisition and restoration decisions to operational readiness
- keep support capacity visible where procurement choices affect throughput
- help the player resolve practical blockers before deployment
- remain concise and systems-oriented

The Procurement and Support view should not:

- become a full inventory spreadsheet by default
- duplicate the Agency view’s broader institutional summary
- become a per-item loot management screen
- hide important bottlenecks behind item lists
- require excessive browsing to resolve obvious blockers

---

## 1. Core player questions

The Procurement and Support view should answer:

1. What important gear or supply bottlenecks exist right now?
2. What can be acquired, replaced, repaired, or restored this week?
3. What is blocked by funding, support, market state, or specialist capacity?
4. Which shortages are affecting readiness or follow-through?
5. Which procurement or recovery actions matter most before deployment?
6. What future operational risk remains even after I buy or restore something?

If the player cannot answer those quickly, the view is failing.

---

## 2. What belongs in Procurement and Support

This view is where material and institutional support constraints become actionable.

This may include:

- key gear availability
- loadout blockers
- replacement items
- repair/recovery-linked items
- procurement costs
- market or access constraints
- support-sensitive recovery throughput
- bottleneck warnings tied to equipment or supply

This screen should unify “what material and support-side capacity is limiting execution.”

---

## 3. Recommended layout

```text
+------------------------------------------------------------------+
| Status Bar / Pressure Strip                                      |
| Funding | Support | Major Bottlenecks | Market State             |
+------------------------------------------------------------------+

| Procurement Summary                                               |
| blocked gear | recovery backlog | support-sensitive constraints  |
+------------------------------------------------------------------+

| Item / Need List               | Selected Detail                 |
| - replacement item             | item / service name             |
| - repair backlog item          | cost / availability             |
| - market-limited resource      | readiness impact                |
| - support-linked requirement   | recovery / support impact       |
|                                | blockers                        |
|                                | acquire / repair / defer        |
+-------------------------------+----------------------------------+

| Support / Throughput Panel                                          |
| support available | specialist bottleneck | projected carryover    |
+------------------------------------------------------------------+

| Actions                                                           |
| [Acquire] [Queue repair] [Defer] [Open agency context]            |
+------------------------------------------------------------------+
```

---

## 4. Information hierarchy

### Highest priority

These should be easiest to see:

- items blocking deployment or clean follow-through
- funding blockers
- repair and replacement bottlenecks
- support or specialist throughput limits
- readiness impact
- what is worth fixing now versus later

### Medium priority

These should remain visible but secondary:

- item category
- location or supplier context
- market/access notes
- broader equipment browsing
- projected secondary benefit

### Lower priority

These can be drilldown only:

- full item histories
- long-form descriptive flavor
- complete inventory detail
- low-value background logistics notes

---

## 5. Main screen sections

### 5.1 Procurement summary

#### Purpose — Procurement summary (section 5.1)

Provide a fast read on current material and support-side constraints.

#### Should display — Procurement summary

- blocked key items
- pending repairs
- current funding pressure
- support-sensitive recovery burden
- most important current bottleneck

#### Example summary text — Procurement summary

Capacity constrained

2 key recovery items delayed

1 replacement loadout blocked by funding

maintenance bottleneck affecting restoration throughput

#### Design rule — Procurement summary

This section should tell the player in seconds whether procurement/support is a serious blocker this week.

### 5.2 Item / need list

#### Purpose — Item / need list (section 5.2)

Present current actionable procurement and restoration needs in a scan-friendly list.

Each row should show:

- item or need name
- status
- cost or blocker
- one key impact
- urgency if relevant
- whether it is acquisition, replacement, repair, or recovery-linked

#### Example row — Item / need list

Field Stabilizer Kit  
Replacement • Funding blocked  
Impact: Team B loadout incomplete

Relay Housing Repair  
Repair • Maintenance delayed  
Impact: recovery carryover likely

Sedation Reserve Refill  
Acquisition • Available  
Impact: improves stabilization options

#### Design rule — Item / need list

The player should immediately see which needs are operationally important versus merely nice to have.

### 5.3 Selected detail panel

#### Purpose — Selected detail panel (section 5.3)

Show what the selected item or need changes if addressed.

#### Should display — Selected detail panel

- item or service name
- category
- acquisition / repair / replacement status
- cost
- funding or market blocker
- readiness effect
- support or recovery impact
- specialist dependency if relevant
- likely consequence if deferred

#### Example structure — Selected detail panel

Item name  
Category / status  
Cost / blocker  
Operational impact  
Support / recovery effect  
Deferral consequence  
Actions

#### Design rule — Selected detail panel

This panel should explain why the item matters in campaign terms, not just inventory terms.

### 5.4 Support / throughput panel

#### Purpose — Support / throughput panel (section 5.4)

Keep the player aware that procurement and restoration are constrained by institutional throughput, not just money.

#### Should display — Support / throughput panel

- support available
- support-sensitive demand
- maintenance or relevant specialist bottleneck
- projected carryover if current backlog remains
- overload or shortage risk

#### Example — Support / throughput panel

Support: 2 available  
Maintenance specialists: 1 available  
Projected carryover: 1 repair remains delayed  
Risk: recovery demand exceeds clean throughput

#### Design rule — Support / throughput panel

Procurement should remain tied to institutional capacity, not treated as a purely transactional store.

---

## 6. Item categories

The view should visually distinguish the most important need types.

### 6.1 Acquisition

A new item, service, or supply input the agency can obtain.

#### Player expectation — Acquisition

- direct cost
- availability may vary
- improves future readiness or flexibility

### 6.2 Replacement

A needed item replacing loss, damage, or depletion.

#### Player expectation — Replacement

- usually more urgent
- often tied to current operational capability
- may be blocked by funding or market access

### 6.3 Repair / restoration

A damaged or degraded asset waiting to return to usable state.

#### Player expectation — Repair / restoration

- specialist or support throughput may matter
- often tied to next-week readiness
- may carry backlog risk if delayed

### 6.4 Support-linked need

A non-item material or throughput need where the main blocker is agency-side support rather than the market itself.

#### Player expectation — Support-linked need

- not resolved by money alone
- often tied to recovery or clean follow-through
- signals institutional strain

---

## 7. Key data the player needs per item or need

For each entry, the screen should expose:

- name
- category
- current status
- major blocker
- funding impact
- readiness or deployment impact
- support/recovery implication
- urgency if deferred

This is the minimum useful comparison set.

---

## 8. Good warnings and blockers

Useful warnings include:

- Funding below replacement cost
- Maintenance bottleneck delaying repair
- Support-sensitive recovery backlog active
- Market access narrowed under current legitimacy
- Loadout remains incomplete for clean deployment
- Repair will not clear before next week

Bad warnings include:

- Procurement may be difficult
- Some constraints apply
- Resource pressure exists

Warnings should always name the real blocker.

---

## 9. Deferral behavior

Deferring a procurement or repair action should be meaningful.

The UI should make clear:

- what remains blocked
- what operational quality is reduced
- whether the consequence is immediate or next-week
- whether deferral is acceptable or reckless

**Good deferral text:**

- Loadout remains incomplete for this week
- Recovery delay reduces next-week readiness
- Replacement pressure remains active
- Clean follow-through remains unlikely under current support state

Deferral should never feel consequence-free.

---

## 10. Interaction patterns

### Pattern A — identify blocker -> inspect -> resolve

Primary flow:

- scan blockers
- inspect the most relevant need
- acquire, repair, or defer
- return to planning with clearer readiness

### Pattern B — agency to procurement/support

The player sees a bottleneck in Agency, then comes here to resolve the material or throughput side of it.

### Pattern C — triage to procurement/support

The player sees in Mission Triage that an opportunity is viable but gear- or support-blocked, then comes here to fix the blocker before deployment.

---

## 11. Common actions

Useful actions from this view:

- Acquire
- Replace
- Queue repair
- Defer
- Open Agency context
- Inspect affected team
- Review related bottleneck
- Open relevant report cause

### Design rule — Common actions

Actions should resolve practical blockers, not open a maze of submenus.

---

## 12. What should not live here

Do not make Procurement and Support:

- a generic shop screen
- a full item encyclopedia
- a duplicate support dashboard
- a full team planner
- a broad faction marketplace simulation

It is the bounded material and throughput management surface.

---

## 13. Example wireframe content

### Procurement Summary

Blocked loadouts: 1  
Repair backlog: 2  
Funding pressure: moderate  
Support-sensitive recovery: active

### Item / Need List

Field Stabilizer Kit  
Replacement • Funding blocked  
Impact: Team B clean deployment reduced

Relay Housing Repair  
Repair • Maintenance delayed  
Impact: next-week readiness risk

Sedation Reserve Refill  
Acquisition • Available  
Impact: improves stabilization options

### Selected Detail

Field Stabilizer Kit

Replacement  
Cost: 6  
Current blocker: funding shortfall

Operational impact:

Team B lacks one key loadout component

clean follow-through risk rises on support-sensitive missions

Deferral consequence:

degraded deployment quality remains likely this week

Actions:

[Acquire] [Defer] [Inspect Team B]

### Support / Throughput

Support available: 2  
Maintenance specialists: 1  
Projected repair carryover: 1 item

---

## 14. UX validation questions

A tester using this screen should be able to answer in under 10 seconds:

- what is currently blocked?
- what can I fix right now?
- what is blocked by money versus throughput?
- which item matters most for readiness?
- what remains risky even if I buy something?

If they cannot, the hierarchy or wording is wrong.

---

## 15. Acceptance criteria

The Procurement and Support view is complete when:

- key procurement and repair blockers are obvious
- funding and throughput constraints are distinguishable
- readiness impact is understandable
- support- and specialist-linked bottlenecks are visible
- the player can resolve important blockers without excessive navigation
- the view connects cleanly to Agency, Triage, and affected teams

---

## 16. Summary

The Procurement and Support view should make the player feel like they are stabilizing the material side of a strained institution.

It should answer:

- what is missing?
- what is broken?
- what can be restored?
- what is blocked by money, support, or throughput?
- what should I fix before I commit more work?

The player should feel:

this is where practical institutional weakness becomes visible, and where some of the week’s clean execution is won or lost.
