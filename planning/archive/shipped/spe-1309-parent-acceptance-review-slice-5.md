# SPE-1309 — Parent acceptance review (grooming slice 5)

One-page grooming record. Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** — unified engine slices 1–6 shipped; AC rows 1–2 **Yes**, row 3 **Partial** (agent vitals deferred); post mirror UI Linear auto-close reconciliation.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1309 child — parent acceptance review (grooming slice 5) (create/claim on start)                       |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine; stays **Backlog** |
| **Branch** | `spe-1309-parent-acceptance-review-slice-5`                                                                |
| **Status** | **Shipped** — PR #2813 @ `62ddbc93`                                                                        |
| **Base `main` SHA** | `92980ab1`                                                                                          |

## Goal

Re-evaluate parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) acceptance criteria after unified cognitive hazard engine slices 1–6 shipped (PR #2807–#2812 @ `0e803263`–`621b2d74`). Reconcile Linear auto-close **Done** (engine child merges, 2026-06-14) vs repo AC matrix and `planning/backlog.md` **Backlog**. Docs + Linear hygiene only — no runtime unless owner reopens AC gaps.

## Prerequisite (on `main` @ `92980ab1`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Engine anchor        | `src/domain/cognitiveHazardEngine.ts` (slice 1 / PR #2807)             |
| GameState persistence | `cognitiveHazardExposureRecords` (slice 2 / PR #2808)                 |
| Weekly exposure tick | `applyWeeklyCognitiveHazardExposureTick` (slice 3 / PR #2809)          |
| Sibling compose      | `composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords` (slice 4 / PR #2810) |
| Simulation triggers  | `cognitiveHazardSimulationTriggers.ts` + weekly report notes (slice 5 / PR #2811) |
| Planning mirror UI   | `cognitiveHazardExposureMirrorView.ts` + route (slice 6 / PR #2812)    |
| Registry child wave  | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) slices 1–4 **Done**; [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) naming-hazard **Done** |
| Prior grooming       | [SPE-2456](https://linear.app/spectranoir/issue/SPE-2456) / PR #2796 — slice 4 AC table @ `25f10aff` (pre-engine) |

**Delta since slice 4 (`25f10aff`):** unified engine slices 1–6 landed — `cognitiveHazardEngine.ts`, `cognitiveHazardWeeklyOrchestration.ts`, `cognitiveHazardSiblingCompose.ts`, `cognitiveHazardSimulationTriggers.ts`, `cognitiveHazardExposureMirrorView.ts`, and `advanceWeek` compose → tick → trigger-note chain. SPE-2108 / SPE-2116 weekly hooks unchanged per slice boundary.

## Parent AC vs shipped evidence (post engine slices 1–6)

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| Unified model covering fear pressure, memetic/infohazard exposure, memory impairment, countermeasure interaction | `CognitiveHazardExposureRecord` + `projectCognitiveHazardExposureReview` in `cognitiveHazardEngine.ts`; persisted on `GameState`; weekly memory-band tick in `applyWeeklyCognitiveHazardExposureTick` | **Yes** |
| Trigger channels explicit (direct perception, recording-mediated, reference/description, memory interaction) | Four-channel taxonomy + `inferTriggerChannelsFromPropagationResistance`; `composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords` merges SPE-2108 tags into `activeTriggerChannels` during `advanceWeek` | **Yes** |
| Cognitive hazard states affect agents, knowledge, and procedures | `cognitiveHazardSimulationTriggers.ts` resolves `agent_duty_degraded`, `knowledge_integrity_degraded`, `procedure_restriction_active`; weekly report notes in `advanceWeek`; mirror UI trigger chips (slice 6) — **no** agent vitals or procedure-registry mutation | **Partial** |
| Narrower cognitive-hazard issues attach without replacing parent | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) compose wire-up (slice 4); [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116), [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) remain sibling registries without replacement | **Yes** |

**Child registry disposition:** [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) and [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) remain **Done**. Engine slices 1–6 are implementation children under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — child closure does not satisfy parent row 3 minimum bar alone.

**Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) disposition:** **Backlog** — AC row 3 remains **Partial** until agent vitals / scoring side-effects from simulation triggers ship. Do **not** mark parent **Done** on engine slice 6 merge alone.

**Doc vs Linear reconciliation:** Linear auto-closed parent **Done** when engine slices 1–6 merged (slice 6 PR #2812, 2026-06-14) while grooming slice 4 doc and `planning/backlog.md` recorded **Backlog** with AC rows 1–3 **No**. Grooming slice 5 updates the AC matrix (rows 1–2 **Yes**, row 3 **Partial**) and returns Linear to **Backlog** — mirror [SPE-2456](https://linear.app/spectranoir/issue/SPE-2456) / [SPE-2451](https://linear.app/spectranoir/issue/SPE-2451) auto-close hygiene pattern; do not conflate engine child **Done** with parent closure while row 3 is **Partial**.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Unified engine runtime implementation       |
| Confirm parent **Backlog** on Linear (guard against auto-close)    | SPE-2108 / SPE-2116 weekly hook changes       |
| `planning/backlog.md` Context + handoff row                        | Agent vitals / scoring side-effects slice     |
| Slice doc (this file) + planning index row                         | Mission triage expansion                      |
| Linear hygiene on grooming slice 5 child                           | Slice 1–6 domain contract edits               |

## Acceptance

- [x] Parent AC re-evaluated against engine slices 1–6 evidence — rows 1–2 **Yes**, row 3 **Partial**
- [x] SPE-1309 **Backlog** on Linear aligned with docs; engine children remain **Done**
- [x] Recommended next step updated post grooming slice 5
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Agent vitals / scoring side-effects from simulation triggers | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) follow-up | Parent AC row 3 **Partial** — slice 5 surfaces via report notes only |
| SPE-2116 naming-hazard compose into exposure records | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) follow-up | Slice 4 compose covers SPE-2108 only; naming-hazard remains localized investigation substitution |
| Sibling registry slice 2+ ([SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119)) | respective children | Schema slice 1 Done; persistence/orchestration deferred per intake wave cadence |
| Segmented population trust / disclosure choice mechanics | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) follow-up | Alternate next step per backlog handoff |
| Investigation exposure dossier surfacing | [SPE-2159](https://linear.app/spectranoir/issue/SPE-2159) / E54 | Out of grooming boundary |

## Validation

Docs-only — no `npm run test:run` required. Optional smoke: `npm run test:run src/features/operations/cognitiveHazardExposureMirrorView.test.ts` (6 passed @ grooming session).

## See also

- `planning/spe-1309-parent-acceptance-review-slice-4.md`
- `planning/spe-1309-unified-engine-slice-6.md`
- `planning/backlog.md`
