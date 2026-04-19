# Containment Protocol — Feature Done Criteria

## Purpose

This document defines the done criteria for features in Containment Protocol.

It exists to ensure that features are not treated as complete simply because they exist in some visible form. A feature is done only when it is implemented, integrated, testable, and legible inside the actual campaign loop.

These criteria are intended to keep the project aligned with Containment Protocol’s core priorities:

- deterministic systems
- bounded implementation
- institutional legibility
- campaign continuity
- explainable outcomes
- real integration with existing state and issue flow

This document is for:

- implementation review
- QA signoff
- milestone readiness
- issue closure evaluation
- scope control

---

## Done criteria goals

A feature should only be considered done when it:

- works in its intended bounded scope
- uses correct canonical state ownership
- integrates with the systems it is supposed to affect
- surfaces its important consequences clearly
- is testable and actually tested
- behaves deterministically where required
- does not silently create parallel truth or placeholder logic

A feature should not be considered done because:

- the UI exists
- a happy path demo works once
- placeholder values appear convincing
- it “basically works”
- the system is implemented but not propagated into reports, pressure, or next-week state

---

## 1. Core definition of done

A feature is done when all of the following are true:

1. the intended bounded behavior is implemented
2. canonical state ownership is correct
3. the feature’s downstream consequences propagate correctly
4. surfaced output is accurate and useful
5. deterministic behavior is validated where applicable
6. edge cases are covered well enough for the current milestone
7. the feature is documented or inspectable enough to support future work
8. the feature is integrated into the current game loop where intended

If any of these are materially missing, the feature is not done.

---

## 2. General feature done checklist

Every feature should pass these baseline checks.

### 2.1 Scope is implemented

- the issue or spec goal is actually present
- the delivered behavior matches bounded intended scope
- no critical part of the requested implementation is still stubbed or implied only

### 2.2 Canonical ownership is correct

- the feature stores state in the right owner
- no critical field is mirrored as parallel truth
- derived output is not silently acting as simulation state

### 2.3 Integration is real

- the feature affects connected systems where intended
- upstream inputs are actually read
- downstream outputs are actually used

### 2.4 Surfacing is real

- the player can understand the important result of the feature
- warnings, reports, or relevant views reflect the feature’s state
- no critical mechanic exists only in hidden code paths

### 2.5 Determinism is intact

- same relevant input state produces same result
- threshold behavior is stable
- save/load does not alter meaning or future outcome unexpectedly

### 2.6 Testing exists

- relevant tests exist or the feature is covered by a fixture/manual plan
- happy path and at least key degraded/edge paths are exercised
- QA has inspectable evidence for correctness

### 2.7 No obvious placeholder logic remains

- fake constants, temporary stubs, or disconnected fallback logic are removed or explicitly tracked
- no “TODO but good enough” path is silently treated as shipped behavior

---

## 3. Feature categories and category-specific done criteria

Different feature types need additional checks.

### 3.1 System feature

Examples:

- pressure mechanics
- support operations
- incident generation
- team management
- mission resolution

A system feature is done when:

- core rules are implemented
- state ownership is correct
- thresholds/bands are wired
- outputs propagate into connected systems
- report or view surfacing exists where appropriate
- deterministic and integration tests cover real cases

### 3.2 UX view feature

Examples:

- Agency view
- Mission Triage
- Hub view
- Procurement and Support
- Operations Report

A view feature is done when:

- it answers its intended player questions clearly
- it surfaces canonical state accurately
- it links correctly to adjacent flows
- it does not duplicate conflicting logic
- empty, warning, and strained states are readable
- UX validation questions can be answered quickly by a tester

### 3.3 Data model / architecture feature

Examples:

- event schema
- persistence model
- game state schema refinement

A model/architecture feature is done when:

- ownership boundaries are explicit
- implementation and persistence rules are unambiguous
- migration or compatibility implications are handled
- dependent systems can use the structure safely
- no major unresolved ambiguity blocks current implementation

### 3.4 Content framework feature

Examples:

- incident template
- mission template
- rumor template
- report template
- style guide

A content framework feature is done when:

- structure is clear and reusable
- terminology is canonical
- examples demonstrate intended quality
- it supports implementation and QA, not just writing style
- it aligns with the current issue and system set

### 3.5 Tuning feature

Examples:

- pressure curves
- resolution thresholds
- resource economy
- escalation and fallout tuning

A tuning feature is done when:

- relevant levers are explicit
- intended player-facing behavior is clear
- test and balancing targets are defined
- the tuning can be validated through fixtures or campaign runs
- no critical system still depends on undefined default tuning

---

## 4. Done criteria for issue closure

Because this project relies on current issues as source of truth, an issue should only be closed when the issue’s implementation boundary is truly satisfied.

An issue is ready to close when:

- the described goal is implemented
- the described scope is covered
- constraints are respected
- acceptance criteria are satisfied
- evidence exists in implementation, tests, or integrated surfaced behavior
- any child issue dependency required for completion is complete

An issue is **not** ready to close when:

- implementation is partial
- only one surface is updated but the system is not integrated
- the intended result exists only in docs or conversation
- remaining gaps are significant but unlabeled
- the parent issue describes more than the implemented subset

If work is partial, the correct action is usually:

- add a progress comment
- or close a smaller child issue
- not close the parent issue

---

## 5. Done criteria by implementation layer

A feature should be checked at multiple layers before signoff.

### 5.1 Domain logic

Questions:

- does the rule actually work?
- does it read and write the right state?
- are thresholds, triggers, and consequence paths correct?

### 5.2 Propagation

Questions:

- do downstream systems react correctly?
- does next-week state change where intended?
- do reports, events, and pressure reflect the result?

### 5.3 Surfacing

Questions:

- can the player tell what happened?
- can the player identify the bottleneck or implication?
- does the relevant view answer its intended question?

### 5.4 Persistence

Questions:

- does save/load preserve the feature state and consequence?
- is hidden helper-state dependency avoided?
- is the feature resilient to reload?

### 5.5 Testing and evidence

Questions:

- what proves this works?
- do we have fixtures, tests, or validation output?
- are edge cases covered enough for this milestone?

A feature that passes only domain logic but fails propagation or surfacing is not done.

---

## 6. Good evidence for “done”

Acceptable evidence may include:

- merged implementation tied to the issue goal
- deterministic test coverage
- integration test coverage
- fixture-based validation output
- correct report notes or surfaced warnings
- save/load continuity proof
- before/after validation in relevant views
- linked issue comments summarizing inspectable evidence

Weak evidence includes:

- “it should work”
- “the UI looks right”
- “the system is mostly there”
- “I tested one path manually”
- “we can finish the rest later” without a separate issue

---

## 7. Common false-done states

These are common cases where work looks done but is not.

### False done 1: UI-only completion

The screen exists, but the underlying system is not integrated.

### False done 2: local-only logic

A rule works in one file or one path, but reports, pressure, or next-week state do not reflect it.

### False done 3: happy-path only

The basic case works, but thresholds, shortage states, or edge conditions are unhandled.

### False done 4: placeholder values

The system looks complete, but hardcoded or temporary values are still shaping outcome.

### False done 5: parent issue closure from partial implementation

One slice of the work is complete, but the broader issue scope is not.

These should be treated as incomplete work, not minor cleanup.

---

## 8. Acceptance criteria handling

If an issue or spec has explicit acceptance criteria, feature closure should verify each one directly.

Recommended rule:

- every acceptance criterion should have clear evidence
- if one is not yet met, the issue is not done
- if criteria changed, update the source of truth explicitly rather than silently redefining “done”

This keeps issue closure deterministic and trustworthy.

---

## 9. Milestone-level done versus feature-level done

Some work may be “done for milestone scope” without being “final forever.”

That is acceptable only when:

- the bounded milestone scope is explicit
- the current issue describes that bounded scope
- no fake completeness is implied
- deferred work is tracked separately

This should never be used to justify silently closing a broader issue.

---

## 10. Suggested signoff questions

Before marking a feature done, ask:

1. Does the implemented behavior match the issue/spec goal?
2. Is the state owned in the right place?
3. Do connected systems react correctly?
4. Can the player understand the result in the relevant surface?
5. Are determinism and persistence intact?
6. Do tests or fixtures prove the important paths?
7. Are any critical placeholders still shaping behavior?
8. Would closing this issue mislead future planning?

If the answer to 4, 5, 6, or 8 is “no,” it usually is not done.

---

## 11. Minimal done criteria by project phase

Different project phases may require different strictness, but some minimums always apply.

### MVP phase minimum

A feature should still have:

- real bounded implementation
- correct ownership
- real campaign integration
- at least one valid surfaced explanation path
- enough testing to trust the main use case

### Post-MVP / hardening phase

A feature should additionally have:

- stronger edge-case coverage
- more complete integration coverage
- persistence and migration confidence where relevant
- refined surfacing quality
- reduced placeholder assumptions

Even in MVP, “exists but disconnected” is not done.

---

## 12. QA signoff expectations

QA should be able to sign off only when:

- intended behavior is inspectable
- key negative and degraded cases were reviewed
- surfaced output matches domain truth
- no critical blocker remains hidden behind future cleanup language

Good QA signoff note:

Mission degradation under support shortage now propagates correctly into report notes and next-week support strain. Save/load continuity matches the same result under the strained fixture.

Bad QA signoff note:

Looks good from what I saw.

---

## 13. Acceptance criteria for this document

This document is effective when:

- issue closure becomes more consistent
- fewer partially implemented systems are marked done
- QA and implementation use the same completion standard
- parent issue closure is less likely to happen prematurely
- milestone reviews can distinguish “real completion” from “visible progress”

---

## 14. Summary

A feature in Containment Protocol is done only when it is implemented, integrated, surfaced, testable, and trustworthy inside the actual campaign loop.

Done means:

- the system works
- the right state owns it
- connected systems react
- the player can read its effect
- evidence exists
- issue closure would be honest

The core question is:

if this feature were never touched again, would the current issue set and current game surfaces tell the truth that it is complete?
