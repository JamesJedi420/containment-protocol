# Infiltration encounter/content batch-4+ audit (SPE-2250)

One-page audit record. Linear: [SPE-2250](https://linear.app/spectranoir/issue/SPE-2250). Follows shipped batch-4 stacks in slices 1–2 (`planning/infiltration-encounter-content-slice-2.md`), report copy [SPE-2305](https://linear.app/spectranoir/issue/SPE-2305), and prep encounter preview [SPE-2308](https://linear.app/spectranoir/issue/SPE-2308).

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Linear** | [SPE-2250 — Infiltration encounter/content follow-through](https://linear.app/spectranoir/issue/SPE-2250) |
| **Status** | **Deferred** — no narratively urgent templates outside batch-4        |

## Goal

Decide whether any catalog templates **outside** the twelve batch-4 IDs warrant optional `infiltrationProbePlan`, `infiltrationCoverProfile`, and `stealthLeaveBehindId` authoring — content-only, no new probe mechanics or prep UI.

## Audit (June 2026)

Catalog snapshot: **48** templates total.

| Bucket | Count | Notes |
| --- | ---: | --- |
| Full stack (triggers + probe + cover + leave-behind) | 33 | Includes all twelve `BATCH_FOUR_TEMPLATE_IDS` |
| Trigger-only (no probe plan) | **0** | Batch-4 follow-through complete |
| Probe without triggers | **0** | No orphan probe plans |
| No triggers, no probe | 15 | Raid / escalation / combat templates — see below |

**Probe-plan catalog count:** 33 (guard in `src/test/infiltrationEncounterContentSlice.test.ts` expects ≥ 33).

### Fifteen templates without infiltration stack

None carry `infiltration`, `disguise`, `covert`, or `stealth` in `tags` / `preferredTags`. All are overt raid, escalation, or combat-response scenarios — not covert-entry narratives.

| Template ID | Title (abbrev.) |
| --- | --- |
| `escalation-psi-002` | Psi Escalation — Cognitive Breach |
| `ops-critical-staffing` | Critical Staffing — Multi-Shift Response |
| `reward-mixed-bundle` | Mixed Reward Bundle — Recovery Operation |
| `chem-001` | Containment Breach — Sector 7 Reagent Leak |
| `bio-001` | Pathogen Trace — Archive Sub-Level 3 |
| `combat-001` | Hostile Contact — Perimeter Incursion |
| `escalation-001` | Anomaly Spread — Sector 9 Contamination Wave |
| `cyber-raid-001` | Digital Cascade — Infrastructure Meltdown |
| `anomaly-raid-001` | Sectoral Collapse — Containment Array Failure |
| `raid-001` | Full Breach Response — Site Gamma |
| `followup_feeding_frenzy` | Feeding Frenzy |
| `ops-006` | Triage Residue Check |
| `extraction-raid-001` | Courtline Recovery — Hostile Transfer Convoy |
| `ops-009` | Evidence Warehouse Quarantine |
| `psi-005` | Cascade Resonance — City Block Zero |

### Eligibility check

Weekly probe ticks require `hiddenState === 'hidden'` **and** an infiltration-family tag (`infiltration` \| `disguise` \| `covert`) per `isInfiltrationProbeEligible` in `src/domain/infiltrationProbe.ts`. Adding probe/cover fields alone on the fifteen templates above would not produce meaningful weekly behavior without also adding concealment triggers and infiltration tags — out of this optional content-only boundary.

## Decision

**Defer** batch-4+ template stack authoring. Revisit only when a new or revised template clearly warrants covert infiltration (e.g. a future concealment migration batch or a narratively covert raid variant).

## Acceptance (audit slice)

- [x] Catalog audited for trigger-only templates outside batch-4
- [x] Fifteen no-stack templates reviewed for infiltration tags and narrative fit
- [x] Deferral recorded on Linear SPE-2250 and in `planning/backlog.md`
- [x] No code changes required (existing guards at 33 probe plans remain valid)

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Template stack authoring when narratively warranted | SPE-2250 follow-up / new child | No eligible templates in current catalog |
| Concealment migration for raid/escalation templates | Separate batch (e.g. SPE-2249 pattern) | Would precede optional infiltration stacks |

## See also

- `planning/infiltration-encounter-content-slice-1.md`, slice 2, slice 3
- `src/test/infiltrationEncounterContentSlice.test.ts`
- `src/test/advanceWeek.infiltrationProbe.integration.test.ts`
