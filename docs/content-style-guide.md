# Containment Protocol — Content Style Guide

## Purpose

This guide defines the tone, structure, and writing rules for all player-facing and development-facing game content.

Use it for:

- incidents
  - incidents
  - missions
  - rumors

## Core writing principles

### 1. Write for a deterministic systems game

Text should help the player understand:

    - what happened
    - why it happened
    - what matters
    - what changed
    - what can be acted on next

Flavor matters, but clarity comes first.

### 2. Use institutional language

The player runs an agency, not a lone adventurer.

Favor wording that sounds:

- operational
- procedural
- administrative
- intelligence-facing - field-report adjacent - strategically legible

  The player runs an agency, not a lone adventurer.

  Favor wording that sounds:

      - operational
      - procedural
      - administrative
      - intelligence-facing
      - field-report adjacent
      - strategically legible

  ### 3. Stay bounded

  Do not write as though every system is infinitely deep, fully simulated, or socially exhaustive.
  The world can feel large without every sentence implying unlimited scope.

      - strange but disciplined
      - terse where possible
      - specific where useful

- communicate the operational problem
- establish stakes
- imply likely risks and unknowns

## Missions / contracts

Voice:

- directive
- practical
- mission-oriented
- reward/risk aware

Goal:

- tell the player what the agency is being asked to do
- frame the commitment and consequences cleanly

## Rumors / leads

Voice:

- uncertain
- socially filtered

## 3. Tone adjectives to aim for

Preferred:

- procedural
- restrained
- tense
- cold
- institutional
- dry but not lifeless
- exact
- weight-bearing
- understated
- deterministic

Avoid:

- whimsical
- florid
- pulpy
- quippy
- overly heroic
- overly mythic

## Missions and Contracts

Voice:

- directive

## 4.1 Use plain, strong nouns

- incident
- mission
- contract
- report
- summary

## 4.2 Prefer short declarative sentences

- “The deteriorating situation has, unfortunately, created a number of cascading difficulties.”

## 4.3 Name causes when known

- “The operation went poorly.”

## 4.4 Avoid emotional overstatement

- “The city is in utter chaos and people are absolutely terrified.”

## 4.5 Imply depth through specifics, not volume

- long paragraphs of vague lore

## Incident Goals

- establish the core problem
- communicate stakes
- suggest unknowns

## Incident Structure

1. observable problem
2. implied cause
3. likely risk
4. operational constraint

## Example Shape

- a location
- a threat
- a constraint
- a risk

## Incident Structure (Recommended)

1. observable problem
2. local stakes
3. uncertainty / anomaly / resistance
4. implied operational challenge

## Example Shape (Recommended)

> Multiple warehouse workers failed to report after a power collapse in the river district. Local responders entered once and withdrew without filing a coherent account. The site remains unsecured and surrounding businesses are closing early.

- This works because it gives:

- a location
- a visible disruption
- an implied anomaly
- a reason to act

## Avoid

- explaining the whole hidden truth upfront
- writing incident text like a short story
- flooding the player with lore before they commit

---

## 6. Writing missions and contracts

## Mission Goals

Mission text should:

- define the operational ask
- identify key constraint or risk
- imply why it matters now
- communicate reward or strategic value if relevant

## Recommended Structure

1. operational directive
2. constraint / risk
3. consequence of success or failure

## Example

> Secure the warehouse perimeter, identify the missing personnel, and determine whether the site remains viable for controlled entry. Delay will increase civilian visibility and reduce containment options.

## Mission Avoid

- vague verbs like “deal with”
- theatrical briefings unless intentionally contextualized
- lengthy exposition before the directive appears

---

## 7. Writing rumors and leads

## Rumor Goals

Rumors should feel:

- incomplete
- socially mediated
- filtered by source
- sometimes wrong in bounded, useful ways

## Style Rules

- keep rumors shorter than incidents
- allow hedging language
- imply source bias
- avoid total certainty unless the system says certainty is warranted

## Useful Phrases

- “reported”
- “believed”
- “unconfirmed”
- “locally attributed”
- “quietly circulating”
- “several sources disagree”
- “credible but incomplete”

## Rumor Example

> Several market carriers are quietly avoiding the old bridge route after dusk. Most describe “machinery” in the fog, though no mechanical source has been identified.

## Rumor Avoid

- omniscient rumor wording
- flavor text with no operational implication
- repeated “someone says something spooky” structures

---

## 8. Writing reports and report notes

## Report Goals

Reports should answer:

- what happened
- why it happened
- what changed
- what now constrains the player

## Report Style

- concise
- causal
- system-explanatory
- low-flavor unless a detail clarifies consequence

## Good Report Note Patterns

- “Support shortage degraded clean follow-through.”
- “Maintenance bottleneck delayed full equipment recovery.”
- “Escalation increased site hostility after delayed response.”
- “Recon quality reduced avoidable exposure.”
- “Coordination overload reduced operational coherence.”

## Canonical Report Note Rule

If a report-note pattern already exists in canonical domain formatting, reuse
that wording instead of redefining it in UI components or copy constants.

Examples of canonical owners:

- `src/domain/reportNotes.ts` for case outcome and report-note content
- `src/domain/shared/outcomes.ts` for typed outcome/consequence interpretation
- `src/domain/shared/distortion.ts` for deterministic distortion summaries

## Report Avoid

- decorative restatements of already-visible outcomes
- emotionally inflated narration
- passive voice when the cause is known

Bad:

- “Things did not go as planned.”

Good:

- “Low readiness and missing recon coverage forced a partial outcome.”

---

## 9. UI copy style

## Buttons

Use short verbs:

- Deploy
- Route
- Defer
- Advance Week
- Review Report
- Inspect Team
- Acquire
- Recover

## Labels

Use direct nouns:

- Support
- Readiness
- Legitimacy
- Pressure
- Recovery
- Fallout

## Warnings

Use:

- short statement
- clear cause
- implied action if possible

Example:

- “Support overload likely.”
- “Maintenance bottleneck active.”
- “Escalation risk rising.”
- “No certified operative assigned.”

## Avoid

- cute button text
- ambiguous labels
- warnings without causes

---

## 10. Worldbuilding style

## Rule

Worldbuilding should be delivered through:

- operational consequences
- surfaced observations
- rumors
- faction signals
- site-specific specifics
- report details

Not through:

- encyclopedia dumps in core flow
- high-volume myth exposition
- generic occult jargon without mechanical meaning

## Best practice

If a detail cannot shape:

- a decision
- a perception of risk
- a consequence
- or a future opportunity

then it probably does not belong in primary flow text.

---

## 11. Mechanical writing rules

## Surface state, not internal implementation

Bad:

- “The game has applied a support penalty.”
  Good:
- “Support shortage degraded clean follow-through.”

## Prefer consequence language over hidden-stat language

Bad:

- “-15 operational efficiency”
  Good:
- “Follow-through degraded under overload.”

## Do not expose code-level concepts in player text

Avoid:

- “flag”
- “modifier stack”
- “resolver”
- “state sync”

Use:

- pressure
- bottleneck
- shortage
- degradation
- escalation
- delay

---

## 12. Style by uncertainty level

## Known facts

Write cleanly and directly.

> The site is compromised.

## Partial facts

Use bounded uncertainty.

> The site is likely compromised, but internal conditions remain unclear.

## Rumor-level facts

Use source-filtered wording.

> Local reports suggest the site is no longer safe after dark.

## Misleading but deterministic output

Write so it is plausible, not obviously false.

> The disturbance is being attributed to utility failure, though field reports remain inconsistent.

---

## 13. Formatting guidance

## Length

- labels: 1–3 words
- warning lines: 3–8 words
- report notes: 1 sentence
- rumors: 1–3 sentences
- incidents: 2–5 sentences
- mission summaries: 1–3 sentences

## Lists

Use bullets when comparing:

- risks
- rewards
- bottlenecks
- outcomes

## Paragraphs

Keep them short.
Prefer 1–3 sentence blocks.

---

## 14. Banned or discouraged patterns

## Discouraged fantasy/TTRPG wording

Avoid unless specifically required by source content:

- destiny
- chosen
- eldritch fate
- heroic party
- dungeon
- questline
- tavern gossip as default framing
- ancient evil awakens
- your brave team

## Discouraged vague ops language

Avoid:

- neutralize the situation
- handle the issue
- address the matter
- proceed accordingly
- all necessary steps

Use concrete language instead.

## Discouraged melodrama

Avoid:

- everything is lost
- unspeakable terror
- unimaginable horror
- city on the brink of madness

Use bounded, visible consequences.

---

## 15. Examples

## Good incident

> A communications blackout spread across three adjacent blocks after a failed substation restart. Residents are reporting synchronized movement behind sealed windows. Utility crews will not return without escort.

Why it works:

- concrete
- eerie
- operationally relevant
- bounded

## Bad incident

> A nameless darkness has fallen over the district, and the terrified populace whispers of ancient powers beyond comprehension.

Why it fails:

- vague
- melodramatic
- low decision value

---

## Good report note

> Coordination overload reduced clean follow-through this week.

Why it works:

- direct
- causal
- mechanically informative

## Bad report note

> The week’s events took a complicated turn.

Why it fails:

- non-specific
- not actionable
- not explanatory

---

## Good rumor

> Two port inspectors independently flagged the same warehouse ledger, but neither would file the report formally.

Why it works:

- partial
- plausible
- actionable

## Bad rumor

> Strange things are happening near the docks.

Why it fails:

- generic
- low signal
- no direction

---

## 16. Author checklist

Before finalizing any content, ask:

1. Is this clear?
2. Does this sound institutional rather than theatrical?
3. Does this help the player decide, understand, or anticipate?
4. Is the cause or implication visible?
5. Is the wording more dramatic than it needs to be?
6. Am I implying more simulation depth than the system actually supports?
7. Could this be shorter without losing meaning?

If yes to 5 or 6, rewrite.

---

## 17. Summary

Containment Protocol writing should feel like:

- a pressured organization trying to stay functional
- reports written for action, not spectacle
- a strange world described through operational consequence
- systems made legible through disciplined language

The style target is:

**restrained, procedural, eerie, and exact**

- a location
- a threat
- a constraint
- a risk
