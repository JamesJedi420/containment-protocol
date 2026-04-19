# Containment Protocol — Edge Case Checklist

## Purpose

This document defines the edge-case QA checklist for Containment Protocol.

Edge-case testing exists to catch failures that often survive normal system and integration testing, especially around:

- threshold boundaries
- empty or nearly empty state
- overloaded or near-overloaded state
- conflicting conditions
- unusual but valid campaign states
- persistence and reload under strain
- surfaced-output correctness under extreme inputs

This checklist is not the full test plan.

It is the bounded reference for high-risk corner cases that should be checked regularly during implementation and milestone review.

This checklist is for:

- QA validation
- regression review
- milestone readiness checks
- implementation self-checks
- bug repro narrowing

---

## Checklist goals

The edge-case checklist should:

- catch boundary-condition failures early
- verify graceful behavior under unusual but legal state
- ensure deterministic handling at thresholds
- protect against empty-state, overload-state, and tie-state regressions
- verify that surfaced output remains legible when state is awkward
- reduce the chance of “works normally, breaks at edges” behavior

The checklist should not:

- replace system or integration test plans
- encourage vague exploratory testing without evidence
- focus on purely cosmetic oddities unless they break meaning
- assume impossible state unless intentionally testing corruption handling

---

## 1. General validation rules

For each edge case, verify:

- canonical state remains valid
- the correct owner holds the changed state
- downstream systems react correctly
- surfaced output stays causal and readable
- save/load continuity is preserved when relevant
- the same state produces the same result repeatedly

---

## 2. Weekly loop edge cases

## 2.1 No new incidents generated

Validate:

- week can advance cleanly
- reports remain useful
- hub and agency views remain stable
- the game does not fabricate fake urgency

## 2.2 Too many valid incident candidates

Validate:

- bounded incident selection still occurs
- tie-break or priority selection is deterministic
- surfaced urgency ordering remains stable
- no duplicate or contradictory intake appears

## 2.3 All routed work deferred

Validate:

- escalation and carryover apply correctly
- report and next-week state explain the consequence
- no hidden processing assumes at least one deployment

## 2.4 No deployable teams available

Validate:

- triage and deployment surfaces remain usable
- warnings are explicit
- invalid deployment is prevented
- next-week implications remain legible

## 2.5 No critical bottlenecks active

Validate:

- views surface stable or low-strain state cleanly
- no empty warning panel behaves incorrectly
- reports do not invent noise

---

## 3. Mission triage edge cases

## 3.1 Only one actionable item exists

Validate:

- triage still reads clearly
- no comparison-specific layout breaks
- actions remain available and legible

## 3.2 Many items have similar urgency

Validate:

- ordering is deterministic
- tie-break rules are stable
- surfaced ranking does not jump between runs

## 3.3 Item is valid but highly uncertain

Validate:

- uncertainty is surfaced clearly
- item remains distinguishable from direct incidents
- route/defer choices still make sense

## 3.4 Item can be safely ignored

Validate:

- UI and wording do not overstate urgency
- no forced-routing assumption exists
- consequence remains bounded and correct

## 3.5 Deferred item escalates exactly at threshold

Validate:

- threshold crossing happens once
- urgency, warnings, and next-week state all agree
- no double-escalation or missed escalation occurs

---

## 4. Deployment edge cases

## 4.1 Team readiness exactly at viability threshold

Validate:

- deployment classification is stable
- warnings match actual threshold result
- repeated runs do not flip between viable and blocked

## 4.2 Critical role missing, but everything else is strong

Validate:

- weakest-link logic behaves correctly
- deployment remains blocked or severely degraded as intended
- surfaced cause names the role gap

## 4.3 Team available, but recovering next week pressure is high

Validate:

- deployment may proceed if intended
- warnings about carryover are visible
- next-week readiness changes correctly

## 4.4 Support exactly equals projected demand

Validate:

- no premature shortage trigger
- support warnings are appropriate to the edge
- next step remains deterministic

## 4.5 Support demand exceeds capacity by one

Validate:

- shortage triggers correctly
- degraded follow-through risk is surfaced
- report/event output matches the cause

## 4.6 Multiple plausible teams with equal fit

Validate:

- ordering is stable
- recommendation logic is deterministic
- no incidental UI ordering changes recommendation

---

## 5. Mission resolution edge cases

## 5.1 Strong team, poor recon

Validate:

- outcome remains plausible
- recon-sensitive degradation appears where intended
- mission does not fail arbitrarily if design expects partial or degraded success

## 5.2 Weak team, strong support

Validate:

- support does not incorrectly erase core team weakness
- result reflects both strengths and bottlenecks
- strongest limiting factor remains visible

## 5.3 Mission result exactly at success/partial threshold

Validate:

- result band is stable
- report notes and events match that band
- no flip-flop across repeat runs

## 5.4 Follow-through exactly at clean/degraded threshold

Validate:

- clean vs degraded remains deterministic
- support/specialist causes surface correctly
- no mismatch between mission result and follow-through state

## 5.5 Failure with contained worst-case

Validate:

- contained failure behaves differently from escalating failure
- fallout remains bounded
- report explanation is specific

## 5.6 Multiple possible fallout items compete

Validate:

- fallout selection/order is deterministic
- strongest or highest-priority fallout appears correctly
- no duplicate application occurs

---

## 6. Support and specialist edge cases

## 6.1 Zero support-sensitive demand this week

Validate:

- support remains stable
- no shortage flags appear
- reports do not mention irrelevant support strain

## 6.2 Support shortage active but only for one mission

Validate:

- only the affected work degrades as intended
- shortage note remains specific
- no unrelated mission receives identical penalty without cause

## 6.3 Specialist backlog exactly matches throughput

Validate:

- queue clears fully and only once
- no leftover phantom backlog remains
- surfaced summary matches actual cleared state

## 6.4 Specialist backlog exceeds throughput by one

Validate:

- one item carries over
- correct item selection/order occurs
- bottleneck note appears once and correctly

## 6.5 Support and specialist bottleneck overlap

Validate:

- causes remain distinguishable
- report output does not collapse them into one vague note
- downstream effects apply to correct lanes

---

## 7. Team management edge cases

## 7.1 Team has one member

Validate:

- readiness/cohesion calculations remain valid
- deployment and mission logic handle the team legally if intended
- UI does not assume multi-member layout

## 7.2 Team member lost or removed while assigned

Validate:

- assignment state resolves correctly
- readiness and role coverage update
- no stale team-local data remains

## 7.3 Operative recovery ends exactly on week boundary

Validate:

- operative becomes available at the correct time
- readiness updates correctly
- no double-availability or missed recovery occurs

## 7.4 Certification gained immediately before routing

Validate:

- deployment and mission checks read current certification state
- no stale validation result persists

## 7.5 Entire bench is degraded

Validate:

- Agency and Triage views remain readable
- warnings prioritize correctly
- no view assumes at least one clean team exists

---

## 8. Pressure mechanics edge cases

## 8.1 Pressure exactly at warning threshold

Validate:

- warning appears once and correctly
- no active-penalty state triggers too early

## 8.2 Pressure exactly at active threshold

Validate:

- band shift is stable
- downstream consequences activate correctly
- surfaced outputs all reflect the same band

## 8.3 Multiple pressure lanes active at once

Validate:

- effects stack only as intended
- surfaced output remains specific
- no lane silently overwrites another

## 8.4 Pressure relief occurs in same week as new pressure gain

Validate:

- final band is correct
- order of operations is explicit and stable
- reports explain the actual end state

## 8.5 Pressure should decay but another system still references old band

Validate:

- stale pressure state is not reused
- all dependent systems see updated final state

---

## 9. Factions and legitimacy edge cases

## 9.1 Legitimacy exactly at access/filter threshold

Validate:

- opportunity quality/filtering changes once
- no inconsistent surface behavior across Hub, Triage, or Reports

## 9.2 Faction relationship changes but presence is zero

Validate:

- relationship updates correctly
- no impossible presence-driven effect appears unless intended

## 9.3 Faction presence high, relationship neutral

Validate:

- presence and relationship are distinguished
- output shaping uses the correct one for the correct effect

## 9.4 Two factions influence the same district or opportunity

Validate:

- priority or blending rules are deterministic
- surfaced context remains understandable
- no contradictory opportunity framing appears

## 9.5 Legitimacy loss and faction gain happen in same week

Validate:

- both effects survive
- one does not erase the other
- hub/report surfaces remain coherent

---

## 10. Hub simulation edge cases

## 10.1 No rumors or leads generated

Validate:

- Hub remains readable
- no broken empty state
- system does not fabricate filler

## 10.2 All surfaced items are partial or misleading

Validate:

- reliability states remain distinguishable
- player still has usable signal
- output does not become useless noise

## 10.3 Same world condition could surface as incident or rumor

Validate:

- chosen surfacing path is correct and deterministic
- no duplicate double-surfacing unless intended

## 10.4 Service access blocked by legitimacy

Validate:

- service state changes visibly
- cause is surfaced clearly
- no stale access action remains enabled

## 10.5 Opportunity persists across weeks at exact expiration boundary

Validate:

- persistence/expiration behavior is correct
- item disappears or persists once, not inconsistently

---

## 11. Procurement and economy edge cases

## 11.1 Funding exactly equals purchase cost

Validate:

- purchase succeeds if intended
- no rounding or comparison bug blocks it
- resulting state updates correctly

## 11.2 Funding short by one unit

Validate:

- purchase fails or defers correctly
- surfaced blocker is explicit
- no partial phantom purchase occurs

## 11.3 Repair cheaper than replace, but specialist lane blocked

Validate:

- blocker reason is lane-specific, not money-specific
- player-facing explanation names the real bottleneck

## 11.4 Multiple blocked items compete for one recovery lane

Validate:

- queue ordering is deterministic
- the correct item clears first
- report and view output match actual queue resolution

## 11.5 Zero purchases available this week

Validate:

- view remains useful
- blockers and reasons still surface cleanly
- no dead-end empty layout breaks navigation

---

## 12. Report and event edge cases

## 12.1 No major negative outcomes this week

Validate:

- report remains concise and useful
- no inflated warning language appears
- positive or stable signals surface appropriately

## 12.2 Many eligible report notes compete for top priority

Validate:

- note ordering is deterministic
- highest-value notes surface first
- no duplicate near-identical notes appear

## 12.3 Same cause could create multiple similar report notes

Validate:

- deduplication or prioritization works correctly
- player sees one strong explanation, not noise

## 12.4 Event emitted but no surfaced note expected

Validate:

- event remains available for debugging/history if intended
- reports do not incorrectly surface low-value noise

## 12.5 Two events imply conflicting wording

Validate:

- note builder resolves conflict coherently
- surfaced output remains causal and non-contradictory

---

## 13. Persistence edge cases

## 13.1 Save at clean planning state

Validate:

- reload preserves all visible planning context
- future result remains identical

## 13.2 Save under active overload / backlog

Validate:

- latent strain survives reload
- no hidden helper-state dependency is required

## 13.3 Save with partially filtered hub state

Validate:

- Hub output remains identical after reload
- no post-load regeneration drift occurs

## 13.4 Save after week resolution, before next planning pass

Validate:

- reports, events, and carryover state are all preserved correctly

## 13.5 Missing or migrated field at boundary case

Validate:

- migration handles the field explicitly
- deterministic weekly outcome remains stable
- no silent default changes campaign meaning

---

## 14. Surface-level UX edge cases

## 14.1 Empty state with no critical warnings

Validate:

- view remains useful
- calm state is readable
- no “error-like” visual language appears

## 14.2 Too many warnings active

Validate:

- highest-priority warnings surface first
- screen remains scannable
- lower-priority warnings do not bury critical blockers

## 14.3 Single item list views

Validate:

- layout does not assume multiple items
- detail and list still read well

## 14.4 Long titles or dense note text

Validate:

- important meaning remains readable
- truncation or wrapping does not destroy clarity

## 14.5 Cross-linked navigation from a degraded state

Validate:

- linked navigation points to the correct bottleneck/team/mission context
- no stale or irrelevant destination is used

---

## 15. Recheck cadence

These edge cases should be rechecked:

- after major threshold tuning
- after changes to canonical ownership
- after save schema changes
- after report-generation changes
- after hub or incident generation changes
- before milestone signoff
- before marking system-level work done

---

## 16. Acceptance criteria

The edge-case checklist is working when:

- threshold-boundary regressions are caught early
- empty, overloaded, and tie states behave correctly
- surfaced output remains causal under awkward inputs
- persistence survives consequence-heavy and filtered states
- edge-case failures are reproducible and inspectable
- milestone reviews can use this checklist to validate resilience, not just normal flow

---

## 17. Summary

The edge-case checklist for Containment Protocol should protect the game where deterministic systems most often fail: at boundaries, ties, overload states, and unusual but valid campaign conditions.

It should ensure:

- the game remains stable at thresholds
- bottlenecks remain readable in bad states
- cross-system consequences do not disappear at awkward edges
- save/load does not break latent campaign meaning

The core QA question is:

when the campaign reaches its awkward, tense, or nearly-broken states, does the simulation still tell one clear, deterministic truth?
