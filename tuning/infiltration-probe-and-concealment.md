# Containment Protocol — Infiltration Probe and Concealment Tuning Spec

## Simulation calibration passes (SPE-25)

Passes such as **SPE-25 — simulation calibration** adjust **constants, bands, and thresholds only**. They do **not** redefine architecture, ownership, or weekly loop structure. Infiltration and concealment changes belong here unless an issue explicitly expands scope (new event kinds, new state owners, or new weekly phases).

## Purpose

This document is the **tuning reference** for batch-4 covert operations:

- **Concealment activation** — when a case becomes `hidden` or `displaced` before weekly probe ticks
- **Infiltration probe tracks** — probe progress, site awareness, stage transitions
- **Cover posture strain** — weekly cover evaluation and threshold events
- **Stealth leave-behind tradeoffs** — mission-resolution score pressure and optional custody fallout

It is **not** the core design spec for mission resolution, disguise validation (SPE-70 field propagation), or full infiltration frameworks (SPE-522 / SPE-1007).

This spec is for:

- systems tuning and balance iteration
- implementation parameterization (single source of truth in code; this doc mirrors it)
- QA validation against `qa/infiltration-concealment-report-matrix.md`
- campaign feel review for covert-ops weeks

---

## Design goals

Infiltration and concealment tuning should:

- make weekly prep (probe action override, leave-behind selection, conceal flag) **visible in reports and events**
- cross **awareness bands** with deterministic threshold events before hard failure
- keep **partial success under authority scrutiny** meaningfully worse than clean success when leave-behind is staged
- preserve **eligibility gates** (`hidden` + infiltration-family tags) so probes do not run on exposed operations by accident

Infiltration and concealment tuning should not:

- introduce client-side re-simulation of probe math
- duplicate threshold logic in UX copy with different numbers than domain constants
- emit **routine** and **threshold** infiltration notes for the same cause in one week

---

## 1. Canonical code owners (implementation)

| Concern | Module | Weekly hook |
| --- | --- | --- |
| Probe tracks, action deltas, awareness thresholds | `src/domain/infiltrationProbe.ts` | `applyWeeklyInfiltrationProbeTick` via `advanceWeek` → `applyWeeklyInfiltrationProbe` |
| Player-facing report copy and event payload enrichment | `src/domain/infiltrationEncounterReportNotes.ts` | Same weekly hook + mission resolve for leave-behind |
| Weekly prep override | `src/domain/infiltrationProbeOverride.ts` | Pre-week flag on case |
| Cover posture / `cover_strain` events | `src/domain/infiltrationCover.ts` | Chained after probe action in `applyWeeklyInfiltrationProbeTick` |
| Concealment activation | `src/domain/hiddenStateActivation.ts` | `applyWeeklyConcealmentActivation` in `advanceWeek` (before probe) |
| Concealment prep UI eligibility | `src/domain/concealmentCasePrep.ts` | Flags `conceal.case.{caseId}` |
| Leave-behind registry and mission pressure | `src/domain/stealthLeaveBehindRegistry.ts` | `resolveAssignedCaseForWeek` → `stealthLeaveBehindMission` |
| Report notes from events | `src/domain/reportNotes.ts` | `buildDeterministicReportNotesFromEventDrafts` |
| Event feed labels / drill-down | `src/features/dashboard/eventFeedView.ts` | Consumes persisted `OperationEvent` records |

**Related tuning (not duplicated here):** mission resolution bands and follow-through breakpoints remain in `systems/resolution-thresholds-tuning.md`. Escalation/fallout tier selection remains in `tuning/escalation-and-fallout.md`.

---

## 2. Concealment activation

### 2.1 Eligibility tags

Cases can activate concealed presence when tags include one of (`hiddenStateActivation.ts`):

`infiltration`, `disguise`, `stealth`, `concealment`, `covert`

Authored `concealmentTriggers` on templates may also apply without manual tag assignment.

### 2.2 Prep flags

| Flag pattern | Effect |
| --- | --- |
| `conceal.case.{caseId}` | Player opted into hidden activation for that case this week |
| `conceal.displace.{caseId}` | Displaced mode when configured |

### 2.3 Default detection confidence on activation

| Mode | Default `detectionConfidence` |
| --- | --- |
| `hidden` | `0.25` |
| `displaced` | `0.55` |

### 2.4 Recon bridge (authored triggers)

When triggers require recon signal:

- `minHiddenModifierCount`: **2**
- `minInvestigationWeight`: **0.3**

Tune only with integration fixtures that include recon modifiers; changing these without fixture updates will break concealment trigger tests.

---

## 3. Infiltration probe eligibility

Weekly probe ticks run only when **both** are true (`isInfiltrationProbeEligible`):

1. `case.hiddenState === 'hidden'`
2. Case tags (including `requiredTags` / `preferredTags`) include at least one of: `infiltration`, `disguise`, `covert`

**Tuning implication:** lowering awareness on a non-hidden case must **not** expect probe events; activation order in `advanceWeek` is concealment **then** probe.

---

## 4. Probe action deltas (per week)

Canonical deltas (`ACTION_DELTAS` in `infiltrationProbe.ts`):

| Action | Δ probe progress | Δ awareness |
| --- | ---: | ---: |
| `probe_access` | +0.15 | +0.12 |
| `probe_route` | +0.10 | +0.18 |
| `cleanup` | +0.02 | −0.15 |

Values are clamped to `[0, 1]` after each tick. Rounding uses three decimal places (`roundBand`).

### 4.1 Action resolution order

1. Player override: `infiltrationWeeklyProbeActionOverride` (if set)
2. Authored `infiltrationProbePlan` (default, progress rules, `cleanupWhenAwarenessAtLeast`)
3. Tag heuristics (`probe_route` vs `cleanup` vs `probe_access` from case tags)
4. Fallback: `probe_access`

Tag heuristic uses `cleanup` when awareness ≥ **complication threshold** (0.55) and case has cleanup-family tags (`media`, `court`, `public`, …).

---

## 5. Awareness and stage thresholds

| Constant | Value | Effect |
| --- | ---: | --- |
| `AWARENESS_COMPLICATION_THRESHOLD` | **0.55** | Cross band → `awareness_complication` event; may promote stage `probing` → `exposed` |
| `VIOLENT_ESCALATION_THRESHOLD` | **0.80** | Cross band → `escalation_violent` when stage becomes `violent` |
| `EXPOSED_DETECTION_CONFIDENCE` | **0.55** | Floor on `detectionConfidence` when stage is `exposed` |
| `VIOLENT_DETECTION_CONFIDENCE` | **0.75** | Floor when stage is `violent`; enables `counterDetection` |

### 5.1 Threshold events (emitted kinds)

| Event kind | Typical trigger |
| --- | --- |
| `awareness_complication` | Awareness crosses 0.55 upward |
| `escalation_exposed` | Same crossing while stage becomes `exposed` from `probing` |
| `escalation_violent` | Awareness ≥ 0.80 and stage `violent` |
| `cover_strain` | Weekly cover posture evaluation (`infiltrationCover.ts`) |

**Report copy:** threshold summaries are **enriched** with weekly prep context (probe action, cover role, leave-behind label, track percentages) via `enrichInfiltrationThresholdSummary`.

### 5.2 Routine weekly encounter

`infiltration.weekly_encounter` emits when:

- Case remains infiltration-eligible and `in_progress`
- Probe tick produced **no** threshold events
- (Typical) probe still changed tracks **or** truly quiet week with no tick change

**Must not** emit in the same week as any threshold infiltration event for that case (duplicate guard in `applyWeeklyInfiltrationProbe`).

---

## 6. Cover posture tuning (awareness bumps)

Weekly cover evaluation adds awareness when strain applies (`infiltrationCover.ts`):

| Strain source | Typical Δ awareness |
| --- | ---: |
| Role mismatch with case tags | +0.08 |
| Route violation tags | +0.06 |
| Weak document tier | +0.05 |
| Weak doctrine band | +0.04 |

`COVER_STRAIN_BAND` (**0.35**) participates in strain visibility logic alongside authority/procedural scrutiny tag sets (`public`, `media`, `court`, …).

Stage mission score adjustments for `exposed` / `violent` stages are owned by infiltration stage mission pressure in `infiltrationProbe.ts` (mission resolution orchestration); tune alongside `systems/resolution-thresholds-tuning.md` § follow-through, not in isolation.

---

## 7. Stealth leave-behind tradeoff

### 7.1 Selection

Player selects `stealthLeaveBehindId` before resolve; registry definitions live in `stealthLeaveBehindRegistry.ts`.

### 7.2 Mission pressure

`stealthLeaveBehindMission.active` when hidden case resolves successfully under configured scrutiny/discovery rules. `shouldDegradeSuccessToPartial` is **registry- and tag-driven** (authority scrutiny + discovery risk), not a single global constant.

### 7.3 Report and event

On mission resolve, when leave-behind mission is active:

- Emit `infiltration.leave_behind_tradeoff` report note and matching event
- **Custody loss optional:** note still emits when `custodyLossRefs` is empty but mission pressure is active (canonical example: `leave-behind:burn-tool` — score malus only, no forensic custody chain)
- When custody refs exist, apply `applyStealthLeaveBehindInvestigationCustodyLoss` and include resolution text in the note

**Tuning workflow:** use social difficulty sweep in `stealthLeaveBehindMission.test.ts` / `infiltrationEncounterReportCopy.test.ts` patterns—do not hard-code a single difficulty in specs without verifying `stealthLeaveBehindMission.active`.

---

## 8. Surfacing contract (reports + event feed)

| Surface | Contract |
| --- | --- |
| Report note `type` | Matches event `type` for infiltration family (`infiltration.*`) |
| Note `content` | `{caseTitle}: {summary}` where `summary` is domain-authored |
| Note `metadata` | Includes `probeAction`, `probeActionSource`, `coverRole`, `leaveBehindLabel` when context exists |
| Event feed | Same payload fields; `weekly_encounter` tone **neutral**; other infiltration types **warning** except `escalation_violent` **danger** |
| Drill-down | Infiltration and concealment events link to `/report/{week}` |

Full invariant matrix: **`qa/infiltration-concealment-report-matrix.md`**.

---

## 9. Calibration workflow

1. Change constant in the owning `.ts` file (never only in this doc).
2. Run unit tests: `infiltrationEncounterReportNotes.test.ts`, `infiltrationProbe.test.ts` (if present), `infiltrationEncounterReportCopy.test.ts`.
3. Run integration: `advanceWeek.infiltrationProbe.integration.test.ts`, `stealthLeaveBehindMission.test.ts`, `weeklyMvpLoopProof.slice2.integration.test.ts`.
4. Update **this file** threshold tables to match.
5. Update QA matrix expected columns if surfacing rules change.

---

## 10. QA and balancing review questions

- Does crossing **0.55** awareness feel like complication before failure?
- Is **cleanup** attractive enough when awareness is high on media/public cases?
- Does **probe_route** materially raise awareness versus **probe_access** on the same fixture?
- After leave-behind selection, does a **successful** resolve still show tradeoff copy when scrutiny applies?
- Does the player see **one** infiltration explanation per week per case (no duplicate routine + threshold)?
- Do override prep choices appear in **both** report metadata and readable summary text?

**Determinism:** same case snapshot + same week + same RNG stream → same probe action, same events, same ordered report notes.

---

## 11. Acceptance criteria

Infiltration and concealment tuning is aligned when:

- Code constants and this document match
- QA matrix rows pass in CI fixtures
- Reports and event feed agree on prep context and awareness/stage bands
- Concealment activation always precedes probe ticks in the weekly pipeline
- Leave-behind tradeoff is visible even when custody loss does not fire

---

## 12. Calibration history

| Pass | Date | Harness | Result |
| --- | --- | --- | --- |
| SPE-25 MVP anchor | May 2026 | `weeklyMvpLoopProof.calibration.test.ts` (4-week loop, cleanup prep week 2) | **No constant changes.** Awareness stays below `VIOLENT_ESCALATION_THRESHOLD` (0.80); cleanup week reduces awareness vs prior week; peak stays within ~0.20 of complication band (0.55). |

When changing `ACTION_DELTAS` or awareness thresholds, re-run this test and update the matrix if bands shift.

---

## See also

- `qa/infiltration-concealment-report-matrix.md` — report/event invariants
- `ux/operations-report.md` §5.3.1 — player-facing note families
- `ux/navigation-map.md` §3.5 — report week navigation
- `planning/infiltration-encounter-content-slice-2.md` — shipped batch-4 scope
- `systems/resolution-thresholds-tuning.md` — mission outcome bands
- `tuning/escalation-and-fallout.md` — fallout tiers after partial/failed resolve
