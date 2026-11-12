# Contextual partial-resolution escalation — SPE-20

Owner: [SPE-20](https://linear.app/spectranoir/issue/SPE-20/escalation-threat-drift-and-time-pressure). User-authorized correction to the unconditional partial-result increment identified in PR #4870. CP core owns this rule; no Academy subsystem is introduced.

Base: `75f8a6c304de15070f7b74b841619dfdebec7762`. Branch: `codex/spe-20-contextual-partials`.

## Decision and boundary

`CaseTemplate.onPartial` and `CaseInstance.onPartial` optionally supply a nonnegative integer `stageDelta`. Omission means zero. Partial results leave the case open; they do not automatically increase its stage or spawn follow-ups. Positive increments must be explicitly authored for the mission. The existing stage-five cap, failure/unresolved rules, rewards, assignment clearing, and independent week-close consequences retain their owners.

The vampire nest explicitly increases by one: survivors can relocate when the team cannot fully secure the site. The archive explicitly stays stable: incomplete cataloguing leaves work open without undoing progress. Other templates without a rule stay stable on partial resolution; this is a deliberate removal of the universal increment, not a claim of a complete content-balance pass. Success/partial follow-up generation is outside this stage-rule correction.

Starter, ambient/follow-up, contract, and mission-intake constructors copy the template rule into the live case. The normal resolution path and post-success downgrade both consume the case rule. Reports emit a stage-escalation consequence only when the stage changes, including at the cap.

## Persistence and compatibility

Save hydration normalizes the saved case's own rule. An absent or malformed rule becomes `{ stageDelta: 0 }`; it never inherits a current starter/template rule. Valid explicit values survive manual run/save import and automatic hydration. This intentionally changes the next partial-resolution behavior of older missions that lack the field from universal `+1` to stable. It does not rewrite past events/reports or replay completed resolutions. Current ruleset behavior is deterministic; cross-ruleset replay equivalence is not claimed. No save-envelope or event-schema version change; general compatibility policy remains with SPE-3403.

Authored template validation rejects invalid increments. Runtime/save normalization is defensive and strips unrelated fields; this partial rule does not advertise spawning, raid conversion, or deadline-reset support.

## Acceptance and evidence

- Reachable: a fresh campaign assigns Night Watch to the vampire nest and Green Tape to the archive through the Cases screen; both produce partial results in week two without fixture overrides.
- Connected: the nest advances from stage one to two and its required resolution profile rises for a later attempt; the archive remains open at stage one with an unchanged required profile.
- Observable: the week-two report shows both partial results, with a stage consequence only for the nest. The archive remains an open mission in triage.
- Persistent: reload between assignment and resolution, then reload the result; both case rules, stages, and report consequences persist. Legacy omission is checked separately as a constructed save.
- End to end: `e2e/partial-mission-outcomes.spec.ts` exercises those player controls, reports and reloads. `src/test/partialMissionOutcomes.integration.test.ts` covers normal simulation, saved omission/malformed rules, generated instances and authored validation. `src/test/sim.coordinationFriction.test.ts` covers stable/increasing rules through the post-success downgrade.

Run targeted tests first, then lint, build and the full unit suite. SPE-3348 selects required validators with `npm run verify:requirements -- --base origin/main --resolve-only`; the e2e change requires the browser job. Record actual results, review findings, PR/merge and Linear lifecycle evidence on SPE-20. Passing this slice does not close other compatibility classes or claim all mission content has been reviewed.
