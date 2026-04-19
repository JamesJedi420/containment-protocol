# Containment Protocol — Report Template

## Purpose

This template defines how weekly reports, operation summaries, and report notes should be authored and structured for Containment Protocol.

Reports are one of the most important player-facing systems in the game.

They are where the player learns:

- what happened
- why it happened
- which bottlenecks mattered
- what changed
- what will constrain next week

Reports are not just summary flavor.
They are the main explanation surface for a deterministic systems game.

This template is for:

- report generation design
- report-note authoring patterns
- UI/report surfacing
- system integration
- QA validation of explanation quality

---

## 1. Authoring goals

A good report should do five things:

1. summarize major outcomes clearly
2. explain causality, not just result buckets
3. identify the most important bottlenecks or pressures
4. communicate persistent consequences
5. support better next-week decisions

A strong report helps the player answer:

- what went well?
- what failed or degraded?
- why?
- what is now overloaded, damaged, or escalated?
- what should be fixed or prioritized next?

---

## 2. Report design principles

### 2.1 Reports explain domain state

Reports should surface precomputed outcomes, not invent new logic.

### 2.2 Reports should be concise

The player should be able to scan the report quickly and still understand:

- major results
- key causes
- main next-step implications

### 2.3 Reports should name causes when known

A report should not just say:

- “mission partial”

It should say why:

- “support shortage degraded clean follow-through”

### 2.4 Reports should prioritize actionable explanation

Not every state change needs equal attention.
The report should emphasize:

- bottlenecks
- overload
- major fallout
- changes in strategic posture

### 2.5 Reports should be institution-facing

The tone should sound like an operations summary, not a dramatic epilogue.

---

## 3. Report structure overview

A weekly report should generally include:

```md
## Headline summary
[1–3 sentence overview]

## Major outcomes
- ...
- ...

## Key report notes
- ...
- ...

## Fallout and pressure changes
- ...
- ...

## Recovery / bottleneck summary
- ...
- ...

## Next-week implications
- ...
- ...
```

Not every UI needs to show every block equally, but the authored/report-generation shape should cover these ideas.

## 4. Required report fields

### 4.1 Headline summary

#### Purpose — Headline summary

Provides a top-level understanding of the week.

#### Rules — Headline summary

- 1–3 sentences
- summarize outcomes at campaign level
- avoid decorative phrasing
- mention partials/failures if they matter strategically
- mention major bottlenecks if they shaped the week

#### Good example — Headline summary

Two operations resolved this week, but one degraded under support strain. Equipment recovery remains delayed, and district visibility increased after a partial containment.

#### Bad example — Headline summary

It was a difficult and eventful week for the agency.

##### Why it fails — Headline summary

- vague
- not causal
- not useful

### 4.2 Major outcomes

#### Purpose — Major outcomes

Lists the most important mission or campaign result categories.

#### Rules — Major outcomes

- keep short
- use concrete state language
- prefer grouped summary over full prose dump

#### Example — Major outcomes

- 2 incidents resolved
- 1 operation ended in partial containment
- 1 district escalated after delayed response
- 1 equipment recovery delay carried into next week

##### Why this matters — Major outcomes

The player should immediately know the shape of the week.

### 4.3 Key report notes

#### Purpose — Key report notes

Explains the main causes of important outcomes.

These are the most important part of the report.

#### Rules — Key report notes

- each note should identify one meaningful cause
- keep each note to one sentence
- use causal language
- avoid redundancy
- prefer bottlenecks over generic commentary

#### Good note examples — Key report notes

- Support shortage degraded clean follow-through.
- Maintenance bottleneck delayed full equipment recovery.
- Recon gaps increased avoidable exposure.
- Escalation pressure worsened site hostility before deployment.
- Coordination overload reduced operational coherence this week.
- Legitimacy pressure narrowed clean response options.

#### Bad note examples — Key report notes

- Things were difficult this week.
- The mission did not go perfectly.
- A number of systems were involved.

### 4.4 Fallout and pressure changes

#### Purpose — Fallout and pressure changes

Surfaces what new burdens or risks now exist.

#### Rules — Fallout and pressure changes

- should identify persistent consequences
- should distinguish immediate mission result from long-tail campaign damage
- should mention the most important new pressure states

#### Examples — Fallout and pressure changes

- Civilian visibility increased in the river district.
- Replacement pressure rose after one operative loss.
- Support strain remains active next week.
- Faction suspicion increased after public containment failure.
- Recovery burden is now limiting clean redeployment.

### 4.5 Recovery / bottleneck summary

#### Purpose — Recovery / bottleneck summary

Summarizes what is currently constrained at the agency level.

#### Rules — Recovery / bottleneck summary

- prioritize current agency-side blockers
- keep the section short
- list only meaningful bottlenecks

#### Examples — Recovery / bottleneck summary

- support capacity remains below weekly demand
- maintenance specialist bottleneck delayed one recovery job
- medical recovery queue is still limiting readiness
- procurement shortage is blocking replacement loadouts

##### Why this matters — Recovery / bottleneck summary

This section translates outcome into next-step planning.

### 4.6 Next-week implications

#### Purpose — Next-week implications

Helps the player understand what the report means for future decisions.

#### Rules — Next-week implications

- keep this section concise
- should imply consequences for triage or preparation
- do not prescribe every exact move

#### Good examples — Next-week implications

- delayed recovery will constrain clean deployment next week
- unresolved district pressure raises escalation risk if ignored again
- support overload should be reduced before concurrent deployments
- faction-sensitive work is now more exposed to legitimacy penalties

## 5. Report note template

Most report logic will generate note text from domain events/state.
Use this structure for authored or templated note design:

### Note type

[system category]

### Trigger

[what caused the note]

### Player-facing note

[1 sentence]

### Optional metadata

- severity: [low / medium / high]
- domain: [support / mission / faction / recovery / escalation]
- links: [incident / mission / team / bottleneck]

## 6. Common report note categories

### Support notes

Examples:

- Support shortage degraded clean follow-through.
- Support capacity cleared all current operational demand.
- Support overload is likely if current routing continues.

### Specialist notes

Examples:

- Maintenance bottleneck delayed full recovery.
- Specialist coverage cleared the recovery queue this week.

### Coordination notes

Examples:

- Coordination overload reduced operation follow-through this week.
- Concurrent load did not exceed coordination capacity.

### Recon / intel notes

Examples:

- Incomplete recon increased exposure risk.
- Improved site knowledge reduced avoidable fallout.

### Escalation notes

Examples:

- Delayed response increased incident severity before contact.
- Escalation pressure was contained before district spillover.

### Legitimacy / faction notes

Examples:

- Visibility costs increased legitimacy pressure.
- Faction access improved outcome quality for this operation.

### Recovery notes

Examples:

- Trauma recovery remains incomplete for one deployed team.
- Equipment repair delay reduced next-week readiness.

## 7. Full weekly report template

### Headline summary
[1–3 sentence campaign-level summary]

### Major outcomes
- [important result]
- [important result]
- [important result]

### Key report notes
- [causal note]
- [causal note]
- [causal note]

### Fallout and pressure changes
- [persistent consequence]
- [persistent consequence]

### Recovery / bottleneck summary
- [bottleneck]
- [bottleneck]

### Next-week implications
- [forward-looking implication]
- [forward-looking implication]

## 8. Example completed weekly report

### Headline summary
Two operations resolved this week, but only one completed cleanly. Support strain and delayed recovery reduced follow-through quality and left one district under elevated visibility pressure.

### Major outcomes
- 1 incident resolved cleanly
- 1 operation ended in partial containment
- 1 district visibility state worsened
- 1 equipment recovery job carried into next week

### Key report notes
- Support shortage degraded clean follow-through.
- Maintenance bottleneck delayed full equipment recovery.
- Escalation pressure increased local hostility before deployment.

### Fallout and pressure changes
- Civilian visibility increased in the river district.
- Recovery burden remains elevated for one team.
- Support strain is still active.

### Recovery / bottleneck summary
- maintenance specialist capacity did not clear all recovery demand
- support availability remains below projected concurrent load

### Next-week implications
- unresolved recovery will constrain clean redeployment
- concurrent routing should be reduced unless support capacity improves

## 9. Operation-level summary template

In addition to weekly summaries, missions may surface local result summaries.

### Mission result
[result band]

### Follow-through
[clean / degraded / broken]

### Main cause
[one dominant cause]

### Fallout
- ...
- ...

### Recovery impact
- ...

#### Example

### Mission result
Partial

### Follow-through
Degraded

### Main cause
Support shortage interrupted clean extraction.

### Fallout
- district visibility increased
- one asset remains unrecovered

### Recovery impact
- equipment recovery demand increased next week

## 10. Report quality checklist

Before approving a report or report-generation pass, confirm:

### Clarity

- Can the player tell what happened in under 10 seconds?
- Is the headline summary useful?

### Causality

- Do the notes explain causes instead of repeating outcomes?
- Are the most important bottlenecks named?

### Persistence

- Does the report make next-week consequences visible?

### Prioritization

- Are the most important notes surfaced first?
- Is noise reduced?

### Tone

- Does the report sound institutional and procedural?
- Is it free from melodrama or generic filler?

### Usefulness

- Can the player infer a better next decision from this report?

## 11. Common mistakes

### Mistake 1: Result-only reporting

Bad:

1 mission partial

1 mission failed

#### Why it fails

- no causal explanation
- low learning value

### Mistake 2: Overly narrative summaries

Bad:

The brave team entered a grim industrial labyrinth and paid dearly for their courage.

#### Why it fails

- wrong tone
- poor strategic clarity
- weak institutional voice

### Mistake 3: Too many low-value notes

Bad:

team moved

mission deployed

week advanced

one note about actual fallout

#### Why it fails

- noise
- hides what matters

### Mistake 4: Abstract warnings

Bad:

System stress increased.

Conditions worsened.

#### Why it fails

- does not identify what changed
- not actionable

## 12. Good reporting patterns

#### Pattern A — Outcome + cause

Partial containment due to weak recon.

Recovery delay caused by maintenance bottleneck.

#### Pattern B — Pressure + implication

Support strain remains active; concurrent deployments are likely to degrade follow-through.

#### Pattern C — Change + future effect

District visibility increased, narrowing clean response options next week.

#### Pattern D — Bounded explanation

Coordination overload reduced operation follow-through this week.

These work because they:

- surface state
- identify causes
- imply strategy

## 13. Formatting guidance

### Ordering

Recommended order:

- headline
- major outcomes
- causal notes
- fallout / pressure
- bottlenecks
- next-week implications

### Length

- headline: 1–3 sentences
- note: 1 sentence
- section bullets: 2–5 items max
- entire report should remain scannable

### Redundancy rule

Do not surface the same information in three different phrasings.
One strong note is better than repeated weak ones.

## 14. Integration notes

Reports should be generated from:

- canonical state
- mission outcomes
- fallout state
- domain events
- explicit bottleneck signals
- support/specialist/pressure outputs

Reports should not:

- recalculate gameplay logic in UI
- introduce alternate truth
- guess at causes not recorded by the domain

If a report note cannot be tied to a clear state/event cause, it should not exist.

## 15. Summary

A good Containment Protocol report is:

- concise
- causal
- institution-facing
- strategically useful
- grounded in canonical state
- clear about pressure and bottlenecks
- forward-looking enough to inform the next week

The player should finish reading a report and know:

what happened, why it happened, what it cost, and what now matters most.
