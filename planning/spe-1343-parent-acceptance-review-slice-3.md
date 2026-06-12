# SPE-1343 — Parent acceptance review (grooming slice 3)

One-page grooming record. Parent [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) **Done** on Linear — truth-layer registry wave + cover pairing + historical-icon fixture evidence closes core AC at Partial/Met minimum bar; sibling deferred work (SPE-1347, SPE-899, SPE-861, SPE-677/SPE-58) does not reopen parent.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2450 — SPE-1343 parent acceptance review (grooming slice 3)](https://linear.app/spectranoir/issue/SPE-2450) |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Public myth / operational truth split; **Done** on Linear (reconciled this slice) |
| **Branch** | `spe-1343-parent-acceptance-review-slice-3`                                                                |
| **Status** | **In progress** — SPE-2450 (PR pending)                                                               |
| **Base `main` SHA** | `138c19b0`                                                                                          |

## Goal

Re-evaluate parent [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) acceptance criteria after [SPE-2446](https://linear.app/spectranoir/issue/SPE-2446) grooming (slice 2), now that truth-layer registry slices 1–4, cover-narrative dual-incident pairing (PR #2778), and historical-icon normalcy pressure fixtures (PR #2779) shipped. Docs + Linear hygiene only — no runtime unless owner reopens AC gaps. Primary delta: AC row 5 moves from **No** to **Partial/Met**; full table re-evaluated against truth-layer wave evidence.

## Prerequisite (on `main` @ `138c19b0`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | [SPE-2447](https://linear.app/spectranoir/issue/SPE-2447) / PR #2772 — `truthLayerRecordRegistry.ts`, `claim` / `doctrine` / `verification` slots, `COMPETING_TRUTH_LAYERS_FIXTURE` |
| GameState persistence | [SPE-2448](https://linear.app/spectranoir/issue/SPE-2448) / PR #2774 — `truthLayerRecords` hydrate wire |
| Weekly orchestration | [SPE-2449](https://linear.app/spectranoir/issue/SPE-2449) / PR #2776 — `applyWeeklyTruthLayerTick`, `projectTruthLayerOpsView`, `mythDrivesOpsWithoutVerification` |
| Planning mirror UI | SPE-1343 slice 4 / PR #2777 — `TruthLayerMirrorPage` |
| Cover dual-incident pairing | PR #2778 — `truthLayerCoverNarrativePairing.ts`, `COASTAL_RESEARCH_CAMPUS_DUAL_INCIDENT_TRUTH_LAYER_FIXTURES` |
| Historical-icon normalcy pressure | PR #2779 — `HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE`, `HISTORICAL_ICON_NORMALCY_TRUTH_LAYER_FIXTURES`, `truthLayerHistoricalIconNormalcy.test.ts` |
| Prior grooming       | [SPE-2446](https://linear.app/spectranoir/issue/SPE-2446) / PR #2769 — slice 2 AC table @ `b0d319f2` |

**Delta since slice 2 (`b0d319f2`):** truth-layer record registry slices 1–4 + cover pairing + historical-icon fixtures shipped; slice 2 AC rows 1–4 and 6 were evaluated against disclosure-registry evidence only — this slice re-evaluates against truth-layer wave.

## Parent AC vs shipped evidence (post truth-layer wave)

Rows 1–4 and 6 updated from slice 2; row 5 is the primary grooming delta.

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| One case can carry multiple competing truth layers | [SPE-2447](https://linear.app/spectranoir/issue/SPE-2447) `TruthLayerRecord` with `competingLayers` refs; `COMPETING_TRUTH_LAYERS_FIXTURE` carries simultaneous claim / doctrine / verification plus sibling cover + operational refs on one site event | **Partial/Met** |
| Public myth can affect operations without being treated as verified mechanism | [SPE-2449](https://linear.app/spectranoir/issue/SPE-2449) `projectTruthLayerOpsView` + weekly snapshots surface `mythInfrastructureActive`, `correctionPressure`, and `mythDrivesOpsWithoutVerification` without collapsing layers; disclosure registry awareness projection remains separate | **Partial/Met** |
| Records can preserve claim, doctrine, and verification separately | [SPE-2447](https://linear.app/spectranoir/issue/SPE-2447) bounded schema + `projectTruthLayerReviewView` preserves separate slots on every fixture record | **Met** |
| At least one incident maintains a public cover narrative alongside a separate agency operational record | PR #2778 `resolveTruthLayerDualIncidentPairing` + coastal campus cover / agency operational sibling fixtures with separate claim vs verification narratives | **Partial/Met** — fixture pairing satisfies minimum bar; cover-story lifecycle state machine deferred [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) |
| At least one historical-icon case preserves public myth, operational truth, and correction pressure as separate review surfaces | PR #2779 `HISTORICAL_ICON_NORMALCY_PRESSURE_FIXTURE` + public-myth / operational sibling fixtures; `projectTruthLayerReviewView` preserves separate surfaces + `correctionPressure` / `mythInfrastructureWeight` | **Partial/Met** |
| The issue can parent god-king, propaganda, sacred-history, and post-breach cover regimes | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) disclosure registry + [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) normalization sibling + truth-layer children [SPE-2447](https://linear.app/spectranoir/issue/SPE-2447)–[SPE-2449](https://linear.app/spectranoir/issue/SPE-2449) attach under parent | **Partial/Met** — attach surface + truth-layer model defined |

**Child disposition ([SPE-2109](https://linear.app/spectranoir/issue/SPE-2109), [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122), [SPE-2447](https://linear.app/spectranoir/issue/SPE-2447)–[SPE-2449](https://linear.app/spectranoir/issue/SPE-2449), cover pairing + historical-icon slices):** **Done** — registry + truth-layer + fixture pairing children satisfy child AC. Parent closure was explicitly out of scope in slice docs until fixture evidence landed.

**Parent [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) disposition:** **Done** on Linear — reconciled this slice. Core AC rows 1–6 meet minimum Partial/Met bar via truth-layer registry wave + PR #2778/#2779 fixtures. Remaining deferred work is sibling-owned and does **not** reopen parent:

| Deferred item | Owner | Blocks parent Done? |
| --- | --- | --- |
| Cover-story lifecycle state machine | [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) | **No** — AC row 4 minimum met by dual-incident fixture pairing |
| Witness normalization wire-up | [SPE-899](https://linear.app/spectranoir/issue/SPE-899) | **No** — out of parent AC rows |
| Disclosure campaign player UI | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) | **No** — post-secrecy orchestration UI; parent AC is record/modeling |
| Belief-track / knowledge-state runtime wire-up | [SPE-677](https://linear.app/spectranoir/issue/SPE-677) / [SPE-58](https://linear.app/spectranoir/issue/SPE-58) | **No** — parent constraint uses compatible types; full wire-up is follow-on, not AC row |

**Doc vs Linear reconciliation:** `planning/backlog.md` and slice 2 doc listed parent **Backlog** while Linear auto-closed **Done** on PR #2779 merge. Grooming slice 3 aligns docs to Linear **Done** with reasoning above — do not return parent to Backlog without owner reopening an AC gap.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Truth-layer runtime changes                 |
| `planning/backlog.md` Context + handoff row                        | Reopen [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) |
| Slice doc (this file) + planning index row                         | Mission triage expansion                      |
| Linear hygiene on [SPE-2450](https://linear.app/spectranoir/issue/SPE-2450) | SPE-1347 lifecycle implementation           |
| Reconcile parent **Done** vs doc **Backlog**                       | Public-disclosure registry runtime changes  |

## Acceptance

- [x] Parent AC re-evaluated with AC row 5 **Partial/Met** (PR #2779) and truth-layer wave updates to rows 1–4, 6
- [x] Parent disposition documented: **Done** on Linear; `planning/backlog.md` aligned
- [x] Deferred sibling table confirms SPE-1347 / SPE-899 / SPE-861 / SPE-677 / SPE-58 do not block parent closure
- [ ] SPE-2450 grooming child **Done** after merge; parent status unchanged
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Cover-story lifecycle state machine | [SPE-1347](https://linear.app/spectranoir/issue/SPE-1347) | AC row 4 Partial/Met — fixture pairing shipped; lifecycle engine out of parent minimum bar |
| Witness normalization wire-up | [SPE-899](https://linear.app/spectranoir/issue/SPE-899) | Out of parent AC rows |
| Disclosure campaign player UI | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) | Post-secrecy orchestration UI; parent record/modeling AC met |
| Belief-track / knowledge-state runtime wire-up | [SPE-677](https://linear.app/spectranoir/issue/SPE-677) / [SPE-58](https://linear.app/spectranoir/issue/SPE-58) | Parent constraint follow-on; compatible types only in truth-layer slice 1 |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/spe-1343-parent-acceptance-review-slice-2.md`
- `planning/truth-layer-historical-icon-normalcy-slice-1.md`
- `planning/truth-layer-cover-narrative-pairing-slice-1.md`
- `planning/truth-layer-record-registry-slice-1.md`
