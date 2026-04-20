# Containment Protocol — Determinism Test Plan

## Purpose

This document defines the determinism-focused QA plan for Containment Protocol.

Determinism is one of the game’s core design pillars. The same canonical campaign state should produce the same systemic result when processed through the same rules.

This plan exists to verify that:

- identical input state produces identical outcomes
- weekly transitions are reproducible
- report notes and surfaced outputs remain causally stable
- save/load roundtrips do not change future results
- no hidden runtime-only state or UI-side recomputation alters behavior

This document is not the full system test plan.

It is the focused test plan for deterministic correctness.

This plan is for:

- QA validation
- regression coverage
- simulation verification
- persistence verification
- milestone trust checks

---

## Determinism goals

Determinism testing should:

- confirm reproducible weekly results from the same state
- catch hidden non-canonical dependencies
- verify stable event and report generation
- ensure tuning changes do not silently introduce randomness-like divergence
- support debugging through repeatable fixture-based validation
- reinforce the game’s explainability and player trust

Determinism testing should not:

- assume “similar enough” output is acceptable
- rely only on manual feel
- ignore surfaced output differences if canonical state is the same
- treat persistence as a separate concern from determinism
- accept invisible unstable tie-break behavior

---

## 1. Core determinism rule

The core rule is:

### Core determinism rule

same canonical input state -> same weekly processing -> same resulting state and surfaced outputs

This applies to:

- incident generation
- hub simulation
- mission resolution
- support and specialist throughput
- pressure propagation
- report notes
- event generation
- save/load continuity

If this rule breaks, the game loses explainability.

---

## 2. What counts as deterministic output

A deterministic test should evaluate at least these outputs:

- resulting canonical campaign state
- emitted domain events
- report notes and key surfaced summaries
- mission outcome bands
- pressure flags / bands
- backlog and recovery changes
- faction / legitimacy state changes
- surfaced opportunities where relevant

Two runs are only meaningfully identical if both domain state and player-facing consequence match.

---

## 3. Test method overview

Determinism tests should primarily use:

### Fixture-based repeat runs

Run the same canonical fixture through the same processing step multiple times.

### Save/load roundtrip runs

Save, reload, then continue processing and compare against non-reloaded continuation.

### Golden expected outputs

Store approved deterministic outcomes for known fixture states.

### Tie-break verification tests

Explicitly test cases where multiple candidates could resolve similarly.

---

## 4. Determinism test fixture categories

### 4.1 Stable baseline fixture

A low-pressure campaign with clear capacity.

#### Use for — Stable baseline fixture

- baseline repeatability
- clean outcome verification
- stable report output

### 4.2 Strained fixture

A campaign with support strain, degraded readiness, and backlog.

#### Use for — Strained fixture

- shortage determinism
- bottleneck ordering
- partial outcome stability

### 4.3 Escalation fixture

A campaign with unresolved incidents and rising visibility or district pressure.

#### Use for — Escalation fixture

- incident generation stability
- escalation threshold stability
- follow-on work generation

### 4.4 Faction/legitimacy fixture

A campaign where social filtering and access are materially active.

#### Use for — Faction/legitimacy fixture

- hub output repeatability
- contract/lead shaping stability
- legitimacy consequence propagation

### 4.5 Persistence fixture

A campaign captured before and after weekly processing.

#### Use for

- save/load continuity
- serialized state completeness
- migration-sensitive deterministic validation

---

## 5. Major determinism test domains

### 5.1 Incident generation determinism

Verify that the same campaign state produces:

- the same incident set
- the same incident categories
- the same escalation context
- the same surfacing path where relevant

#### Must catch — Incident generation determinism

- unstable candidate ordering
- hidden seed drift
- fixture-order dependence
- non-canonical world-state reads

---

### 5.2 Hub simulation determinism

Verify that the same campaign state produces:

- the same rumors
- the same leads
- the same contracts
- the same reliability/filtering states
- the same faction/district shaping

#### Must catch — Hub simulation determinism

- unstable opportunity ordering
- inconsistent reliability assignment
- UI-side logic influencing output

---

### 5.3 Mission resolution determinism

Verify that the same mission input state produces:

- the same result band
- the same follow-through quality
- the same fallout distribution
- the same causal event output
- the same report-note-relevant causes

#### Must catch — Mission resolution determinism

- hidden ordering bugs
- unstable weakest-link selection
- implicit non-canonical inputs
- threshold-edge inconsistencies

---

### 5.4 Support and specialist determinism

Verify that the same weekly demand state produces:

- the same shortage flags
- the same backlog results
- the same throughput delays
- the same support/specialist report notes

#### Must catch — Support and specialist determinism

- queue ordering instability
- capacity consumption order bugs
- runtime-only carryover assumptions

---

### 5.5 Pressure propagation determinism

Verify that the same state produces:

- the same pressure bands
- the same pressure-triggered downstream effects
- the same pressure relief when applicable

#### Must catch — Pressure propagation determinism

- hidden multi-step ordering drift
- partial updates depending on evaluation order
- non-repeatable chain effects

---

### 5.6 Report determinism

Verify that the same state and/or event history produces:

- the same headline summary
- the same major outcomes
- the same ordered key report notes
- the same surfaced bottleneck emphasis

#### Must catch — Report determinism

- unstable note prioritization
- duplicate or dropped note generation
- inconsistent wording path from same cause

---

### 5.7 Event determinism

Verify that the same state transition emits:

- the same event types
- the same event payloads
- the same event ordering where order matters
- the same surfaced flags and severity

#### Must catch

- duplicate event emission
- unstable event ordering
- missing events due to non-deterministic branching

---

## 6. Save/load determinism

Persistence is a determinism-critical area.

For any important campaign fixture:

1. run one week forward without saving
2. save the same pre-week state
3. reload it
4. run one week forward
5. compare outputs

The resulting canonical state, events, and surfaced outputs should match.

### Validate specifically

- no missing fields after deserialize
- no helper-state dependency
- no UI-derived state required
- no hidden one-time initialization effects
- no post-load recomputation drift

---

## 7. Tie-break determinism

Some systems may legitimately choose among multiple valid candidates.

When that happens, tie-break rules must still be deterministic.

### Common tie-break areas

- incident candidate selection
- hub opportunity ordering
- bottleneck prioritization
- report note ordering
- backlog resolution ordering
- target selection for degraded consequences

### Test requirement

Whenever two candidates are equally plausible, the system must still resolve them the same way every run.

This should be based on explicit rules, not incidental iteration order.

---

## 8. Determinism edge tests

The test plan should include threshold-edge states.

Useful edge cases:

- support demand exactly equals capacity
- support demand exceeds capacity by one
- one critical certification missing
- escalation level exactly at a band threshold
- legitimacy exactly at a filtering threshold
- two candidate incidents have equal priority
- backlog size exactly matches specialist throughput
- one report note priority tie

These are high-risk cases for unstable behavior.

---

## 9. Failure signatures to watch for

Determinism problems often appear as:

- same fixture, different mission result
- same outcome, different report notes
- same state, different hub item ordering
- save/load changes next-week opportunity set
- same pressure state, different triggered fallout
- same events, different surfaced priority ordering
- same threshold edge, inconsistent band resolution

These should be treated as systemic trust issues, not minor quirks.

---

## 10. Evidence to compare

Determinism tests should compare at least:

- canonical state snapshot
- event log entries
- report output
- key surface summaries
- ordering of surfaced high-priority items
- relevant backlog / queue state

If state matches but surfaced output differs, that is still a determinism problem for a game built on legibility.

---

## 11. Suggested automated assertions

Useful assertion types include:

### Exact state equality

For canonical state fields expected to remain identical.

### Stable output equality

For events, notes, and surfaced lists expected to match exactly.

### Ordered equality

For ranked outputs such as note priority or candidate selection.

### Serialization roundtrip equality

For save/load continuity of canonical state.

### Threshold consistency assertions

For cases just below, at, and above important threshold values.

---

## 12. Suggested manual validation passes

Even with automated tests, manual review should confirm:

- weekly report wording remains stable
- bottleneck emphasis remains stable
- visible ordering of high-priority work is stable
- save/load does not visually change next-week planning context
- player-facing consequences match underlying identical state

Manual QA matters because surfaced instability can be obvious even when raw state differences are subtle.

---

## 13. Good determinism scenarios

Useful fixture scenarios include:

### Scenario A — clean success repeat run

A healthy team resolves a manageable mission.

#### Expected — Scenario A (clean success repeat run)

- same success band
- same follow-through
- same event and report output every run

### Scenario B — support shortage repeat run

A support-sensitive mission exceeds support capacity by one unit.

#### Expected — Scenario B (support shortage repeat run)

- same degradation path
- same shortage event
- same report note every run

### Scenario C — escalation edge repeat run

An incident is exactly at the threshold where escalation rises.

#### Expected — Scenario C (escalation edge repeat run)

- same escalation result every run
- same follow-on effect and surfacing

### Scenario D — save/load continuity run

A strained campaign is saved mid-planning, reloaded, and advanced.

#### Expected — Scenario D (save/load continuity run)

- same next-week outputs as uninterrupted play

### Scenario E — faction-filtered hub run

Hub output is strongly shaped by faction presence and legitimacy.

#### Expected — Scenario E (faction-filtered hub run)

- same rumor/lead/contract set and reliability ordering every run

---

## 14. Bad determinism assumptions to avoid

### Bad assumption 1: “close enough” is fine

Close enough is not enough for deterministic campaign logic.

### Bad assumption 2: only gameplay-critical state matters

Surfaced outputs matter too, because they teach the player how the system works.

### Bad assumption 3: save/load is a separate problem

Save/load is a core determinism problem.

### Bad assumption 4: ordering does not matter

Ordering often changes player interpretation and planning.

### Bad assumption 5: hidden stable randomness is acceptable without explicit control

If seeded selection is used, it must still be reproducible from canonical state.

---

## 15. QA workflow expectations

For each determinism test case, QA should record:

- fixture name
- processing step run
- expected state/output hash or snapshot
- actual result
- divergence type if any
- evidence source

Divergence should be categorized as:

- canonical state mismatch
- event mismatch
- surfaced output mismatch
- ordering mismatch
- save/load mismatch
- threshold-edge inconsistency

This helps debugging target the real failure boundary.

---

## 16. Acceptance criteria

Determinism testing is working when:

- repeat runs of the same fixture produce identical results
- save/load roundtrips preserve future results
- high-priority surfaced outputs are stable
- threshold-edge cases resolve consistently
- candidate ordering and note ordering are stable
- no hidden helper-state dependency is required
- determinism regressions are easy to reproduce and inspect

---

## 17. Summary

The determinism test plan for Containment Protocol should ensure that the game behaves like a trustworthy systems-driven campaign sim.

It should verify that:

- state transitions are reproducible
- bottlenecks and consequences remain stable
- reports and views do not drift from canonical truth
- persistence preserves future outcomes
- the same campaign state always teaches the same lesson

The core QA question is:

if the institution is in the same state, does the game always tell the same truth about what happens next?
