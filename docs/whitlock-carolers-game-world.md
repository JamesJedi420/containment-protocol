# Whitlock Carolers Game-World Node

## Status

Canonical content-design node for future incident, registry, and artifact authoring.

This document adapts **The Midnight Carolers** into the Containment Protocol game world as a bounded occult / resonance / artifact case family. It does not add runtime behavior by itself. It defines the operational shape, hidden-truth boundary, and future implementation seams.

Source context:

- External story/blog context: `https://www.tumblr.com/blog/nocturnalversesandtales`
- Working worldbuilding source: `The Midnight Carolers - Worldbuilding` Google Doc
- Linear slice: `SPE-2416`

## Canonical title set

- Story-world incident: **The Whitlock Advent Incident**
- Artifact: **The Whitlock Carolers**
- Family: **Arthur Whitlock**, **Clara Whitlock**, **Mabel Whitlock**
- Witness source: **Mrs. Peake**
- Site: **St. Bartholomew's parish store / pageant inventory**

## Game-world premise

A parish inventory audit identifies three antique mechanical carolers that have appeared in seasonal records for more than a century without a clean acquisition chain. The figures activate only during Advent preparation windows. The father and child figures sing cleanly. The mother figure enters half a beat late and appears to apply increasing pressure to the child's sleeve across repeated uses.

The operational problem is not a simple haunted-object recovery. The carolers behave like a voice-pattern storage artifact bound to family recognition, ritual repetition, and annual public use. The site is low-visibility until the church prepares a public pageant or restoration crew handles the figures.

## Containment Protocol fit

This node should enter the game through operational surfaces, not prose exposition.

Recommended entry points:

- incident intake: parish inventory discrepancy / pageant rehearsal malfunction
- registry item: antique mechanical caroler set with voice-pattern behavior
- rumor: restoration staff hear an alto line from a locked storage room
- post-incident review: responders report timing drift in hymn recordings
- archive reference: Whitlock family disappearance, closed as grief-related flight or murder-suicide without bodies

## Primary domains

- Occult resonance
- Artifact containment
- Church / civic records
- Family-recognition anomaly
- Mechanical routine / timing drift
- Preserved voice-pattern behavior

## Boundaries

Do not confirm whether Mabel Whitlock is present, copied, partially returned, or simulated by the artifact. Player-facing content should treat the voice as an unresolved pattern. Internal notes may describe the mechanism as a recognition-gated family account.

Do not make Arthur Whitlock a trained cultist or corporate agent. He should remain a local craftsman whose repeated labor created a usable occult mechanism.

Do not make Clara Whitlock passive in internal summaries. The mechanism stabilizes because she answers the missing line. That detail matters because the artifact responds to recognition, not only blood, death, or sacrifice.

Do not write this as a ghost-doll case. Use operational specifics: inventory records, hymn timing, restoration logs, storage custody, unexplained activation, responder audio contamination.

## Hidden-truth model

The Whitlock Carolers are a family-recognition resonance artifact. The set can reproduce voice fragments, but stable activation requires a living witness or recorded recognition event tied to the family account.

The mother figure's half-beat delay is not damage. It is resistance, incomplete synchronization, or a recurring containment flaw. Preserve ambiguity.

## Suggested authored template candidate

Template ID candidate: `occult-009`

Title: **Whitlock Caroler Inventory**

Mode: `probability`

Kind: `case`

Recommended difficulty:

```ts
difficulty: { combat: 8, investigation: 42, utility: 32, social: 38 }
weights: { combat: 0.05, investigation: 0.45, utility: 0.25, social: 0.25 }
```

Tags:

- `occult`
- `resonance`
- `artifact`
- `church`
- `tier-2`

Preferred tags:

- `medium`
- `tech`
- `scholar`
- `negotiator`
- `covert`
- `infiltration`

Region affinity: `occult_district`

Pressure value: `7`

## Player-facing incident copy candidate

A parish storage audit found three antique mechanical carolers listed in pageant inventory without a matching donation record. Restoration staff report that the figures begin singing only after the building is locked, and one voice enters half a beat late on every recording. The church intends to display the figures during Advent rehearsals unless the agency secures the set first.

## Observable problem

- antique caroler set appears in parish inventory without a clean acquisition record
- after-hours singing is confirmed on two independent recordings
- the mother figure enters late on every hymn sequence
- sleeve damage on the child figure increases between inspections

## Immediate stakes

- public display window will increase civilian exposure
- restoration handling may activate the set outside controlled conditions
- parish staff are already normalizing the anomaly as old mechanical failure

## Uncertainty / anomalies

- recordings capture an additional alto line not produced by any visible mechanism
- inventory photographs show small posture differences between years
- the child figure uses a documented mis-sung lyric associated with the Whitlock disappearance file

## Operational implications

- likely requires quiet recovery or controlled inspection before pageant rehearsal
- social handling matters because church staff believe the figures are heritage property
- technical handling matters because forced disassembly may destroy useful evidence or increase activation
- medium / occult review may be needed to distinguish voice-pattern storage from entity possession

## Suggested escalation if delayed

Delay pushes the figures into a public rehearsal cycle. Civilian exposure rises, witness accounts multiply, and at least one parish volunteer may begin repeating the late alto line involuntarily.

## Follow-up hooks

If unresolved:

- spawn an audio-resonance or memorial-echo follow-up
- create a restoration-lab custody incident
- generate a post-incident review about recognition-triggered artifact handling

If failed:

- spread hymn-timing drift into local recordings
- increase public-disclosure pressure through church social media footage
- mark a responder or witness as carrying a recurring alto-line contamination

If resolved cleanly:

- unlock a minor anomaly item record for the Whitlock Carolers
- preserve the artifact as an archive object with recurring Advent-risk checks
- add a future research lead for non-anatomical fragment storage

## Registry candidates

### Minor anomaly item

Label: `The Whitlock Carolers`

Category: mechanical / devotional artifact

Known behavior:

- activates during Advent-associated preparation windows
- preserves or reproduces family-linked vocal patterns
- resists disassembly by increasing timing drift and pressure marks
- generates contamination risk through repeated listening

Safe handling:

- avoid singing along during inspection
- keep figures separated from hymnals, pageant costumes, and public church audio systems
- photograph hands, mouth hinges, and child figure sleeve before and after handling
- preserve custody logs even when figures appear inert

### Unexplained location

Label: `St. Bartholomew's parish store`

Category: church storage / seasonal display site

Known behavior:

- storage room reports after-hours choral audio without power draw
- inventory records add older pageant references after review
- local witnesses disagree on when the figures first entered parish custody

## Integration notes

This node should remain content-first until a dedicated authored-template slice adds runtime entries to `src/domain/templates/caseTemplates.occult.ts` and `CASE_LORE_STUBS` in `src/data/copy.ts`.

Recommended future implementation scope:

1. add `occult-009` to occult templates
2. add lore stub to `CASE_LORE_STUBS`
3. add a minor anomaly item registry fixture if the registry authoring seam is ready
4. add regression coverage only if template contract tests require fixture updates

## Tone guardrail

Player-facing text should remain restrained and procedural. Avoid phrasing like haunted dolls, cursed toys, ancient ritual, or evil carolers. Use evidence language: inventory mismatch, audio drift, custody anomaly, restoration risk, and recognition-gated activation.
