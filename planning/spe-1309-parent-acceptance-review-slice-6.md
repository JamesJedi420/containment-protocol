# SPE-1309 — Parent acceptance review (grooming slice 6)

One-page grooming record. Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) **Done** — unified engine slices 1–7 shipped; AC rows 1–3 **Yes** after vitals slice 7; Linear auto-close aligned with repo matrix.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1309 child — parent acceptance review (grooming slice 6) (create/claim on start)                       |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine; **Done**      |
| **Branch** | `spe-1309-parent-acceptance-review-slice-6`                                                                |
| **Status** | **Shipped** — PR #2815 @ `0ec51d86`                                                                        |
| **Base `main` SHA** | `cbcd70d5`                                                                                          |

## Goal

Re-evaluate parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) acceptance criteria after unified engine slice 7 (agent vitals / scoring side-effects, PR #2814 @ `a0f8e9ec`). Reconcile Linear auto-close **Done** (slice 7 merge, 2026-06-14) vs repo AC matrix and `planning/backlog.md`. Docs + Linear hygiene only — no runtime unless owner reopens AC gaps.

## Prerequisite (on `main` @ `cbcd70d5`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Engine slices 1–6    | `cognitiveHazardEngine.ts` through mirror UI — PR #2807–#2812           |
| Simulation triggers  | `cognitiveHazardSimulationTriggers.ts` + weekly report notes (slice 5 / PR #2811) |
| Agent vitals side-effects | `cognitiveHazardSimulationTriggerVitals.ts` + `advanceWeek` wire + `computeTeamScore` penalties (slice 7 / PR #2814) |
| Prior grooming       | `planning/spe-1309-parent-acceptance-review-slice-5.md` — rows 1–2 **Yes**, row 3 **Partial** @ `62ddbc93` |

**Delta since slice 5 (`62ddbc93`):** slice 7 landed — `cognitiveHazardSimulationTriggerVitals.ts` syncs `cognitive_hazard:*` status flags and bounded stress/morale deltas from slice 5 trigger summaries; `COGNITIVE_HAZARD_CALIBRATION` duty/knowledge team-score penalties in `scoring.ts`. SPE-2108 / SPE-2116 weekly hooks unchanged per slice boundary.

## Parent AC vs shipped evidence (post engine slice 7)

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| Unified model covering fear pressure, memetic/infohazard exposure, memory impairment, countermeasure interaction | `CognitiveHazardExposureRecord` + `projectCognitiveHazardExposureReview`; persisted on `GameState`; weekly memory-band tick — unchanged since slice 5 | **Yes** |
| Trigger channels explicit (direct perception, recording-mediated, reference/description, memory interaction) | Four-channel taxonomy + SPE-2108 compose in `advanceWeek` — unchanged since slice 5 | **Yes** |
| Cognitive hazard states affect agents, knowledge, and procedures | Slice 5: simulation triggers + weekly report notes + mirror chips. Slice 7: `applyCognitiveHazardSimulationTriggerVitalsToAgents` maps trigger kinds to `cognitive_hazard:duty_degraded` / `knowledge_degraded` / `procedure_restricted` vitals flags + stress/morale deltas; `computeTeamScore` duty/knowledge strain penalties | **Yes** |
| Narrower cognitive-hazard issues attach without replacing parent | SPE-2108 compose wire-up; SPE-2116 / SPE-2118 / SPE-2119 remain sibling registries — unchanged since slice 5 | **Yes** |

**Child registry disposition:** [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) and [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) remain **Done**. Engine slices 1–7 are implementation children under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — all **Done**.

**Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) disposition:** **Done** — AC rows 1–3 meet minimum bar after slice 7 vitals/scoring wire-up. Row 4 attach pattern satisfied.

**Doc vs Linear reconciliation:** Linear auto-closed parent **Done** when slice 7 merged (PR #2814, 2026-06-14) while grooming slice 5 doc and `planning/backlog.md` recorded **Backlog** with row 3 **Partial**. Grooming slice 6 updates the AC matrix (row 3 **Yes**) and confirms Linear **Done** — mirror prior auto-close hygiene in reverse: docs now align with Linear when matrix supports closure; do not return parent to **Backlog** without reopened AC gap.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Unified engine runtime implementation       |
| Confirm parent **Done** on Linear aligned with docs                | SPE-2108 / SPE-2116 weekly hook changes       |
| `planning/backlog.md` Context + handoff row                        | Slice 1–7 domain contract edits               |
| Slice doc (this file) + planning index row                         | Mission triage expansion                      |
| Linear hygiene on grooming slice 6 child                           | Procedure-registry mutation follow-up         |

## Acceptance

- [x] Parent AC re-evaluated against slice 7 evidence — rows 1–3 **Yes**, row 4 **Yes**
- [x] SPE-1309 **Done** on Linear aligned with docs
- [x] Recommended next step updated post grooming slice 6
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-2116 naming-hazard compose into exposure records | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) follow-up sibling | Slice 4 compose covers SPE-2108 only; out of parent AC minimum bar |
| Procedure-registry gates from `procedure_restricted` flag | follow-up under operations/deploy | Slice 7 surfaces flag + scoring for duty/knowledge only; not parent AC blocker |
| Sibling registry slice 2+ ([SPE-2118](https://linear.app/spectranoir/issue/SPE-2118), [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119)) | respective children | Schema slice 1 Done; persistence/orchestration deferred per intake wave cadence |
| Segmented population trust / disclosure choice mechanics | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) follow-up | Next recommended implementation target per backlog handoff |
| Investigation exposure dossier surfacing | [SPE-2159](https://linear.app/spectranoir/issue/SPE-2159) / E54 | Out of grooming boundary |

## Validation

Docs-only — no `npm run test:run` required. Optional smoke: `npm run test:run src/test/cognitiveHazardSimulationTriggerVitals.test.ts` (6 passed @ grooming session).

## See also

- `planning/spe-1309-parent-acceptance-review-slice-5.md`
- `planning/spe-1309-unified-engine-slice-7.md`
- `planning/backlog.md`
