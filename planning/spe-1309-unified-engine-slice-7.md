# SPE-1309 — Unified cognitive hazard engine (slice 7)

One-page implementation plan. Linear: child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — **agent vitals / scoring side-effects from simulation triggers (slice 7)** (create/claim on start). Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** until grooming slice 6 reconciles AC row 3 after vitals ship.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1309 child — agent vitals / scoring side-effects from simulation triggers (slice 7)                    |
| **Status** | **Shipped** — PR #2814 @ `a0f8e9ec`                                                                        |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine (umbrella)    |
| **Branch** | `spe-1309-unified-engine-slice-7`                                                                          |
| **Base `main` SHA** | `195369f3`                                                                                          |

## Goal

Wire slice 5 simulation trigger kinds (`agent_duty_degraded`, `knowledge_integrity_degraded`, `procedure_restriction_active`) into agent vitals status flags and bounded stress/morale deltas during `advanceWeek`, plus team-score penalties in `computeTeamScore` — without mutating slice 1–6 compose/tick/trigger contracts or SPE-2108 / SPE-2116 weekly hooks.

## Prerequisite (on `main` @ `195369f3`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Simulation triggers  | `cognitiveHazardSimulationTriggers.ts` + weekly report notes (slice 5 / PR #2811) |
| Planning mirror UI   | `cognitiveHazardExposureMirrorView.ts` (slice 6 / PR #2812)            |
| Parent grooming      | `planning/spe-1309-parent-acceptance-review-slice-5.md` — AC row 3 **Partial** @ `62ddbc93` |
| Vitals flag pattern  | `recoveryImpairments.ts` (`exposure:residue`), `downtimeSideWork.ts` (`impaired:alcohol`) |

## Vitals side-effect contract (slice 7)

- **Inputs** — post-tick `cognitiveHazardExposureRecords` + prior-week map (terminal erased guard inherited from slice 5 summaries).
- **Agent resolution** — `resolveAgentIdsForCognitiveHazardSubjectRef` via `resolveCognitiveHazardSiblingRefKeys` overlap on `agent:${agentId}`.
- **Status flags** — `cognitive_hazard:duty_degraded`, `cognitive_hazard:knowledge_degraded`, `cognitive_hazard:procedure_restricted`.
- **Vitals deltas** — bounded stress/morale from `COGNITIVE_HAZARD_CALIBRATION` by exposure review band.
- **Flag sync** — strip cognitive-hazard flags each week; re-apply only for active trigger summaries.
- **Scoring** — `computeTeamScore` duty/knowledge strain penalties when flags present.
- **No new persistence fields** — vitals on `GameState.agents` only.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `cognitiveHazardSimulationTriggerVitals.ts` + `advanceWeek` wire   | Slice 1–6 domain compose/tick/trigger edits |
| `COGNITIVE_HAZARD_CALIBRATION` + scoring penalties                 | SPE-2108 / SPE-2116 weekly hook changes       |
| Targeted domain + `advanceWeek` integration tests                    | Full SPE-1309 parent Done (grooming slice 6) |
| Slice doc (this file) + backlog handoff                            | Mirror UI changes                             |

## Acceptance

- [x] Empty exposure map is a no-op without throw
- [x] Active triggers apply deterministic status flags + stress/morale deltas to linked agents
- [x] Terminal erased records do not re-apply vitals on subsequent weeks
- [x] Flags strip when triggers stop emitting
- [x] `advanceWeek` integration matches direct vitals helper output
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/cognitiveHazardSimulationTriggerVitals.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/sim/calibration.ts`, `src/domain/sim/scoring.ts` |
| Tests  | `src/test/cognitiveHazardSimulationTriggerVitals.test.ts`, `src/test/advanceWeek.cognitiveHazardSimulationTriggerVitals.integration.test.ts` |
| Plan   | `planning/spe-1309-unified-engine-slice-7.md`, `planning/backlog.md`  |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1309 parent acceptance / AC row 3 closure | grooming slice 6 follow-up | Vitals slice may satisfy row 3 **Yes** — grooming reconciles |
| SPE-2116 naming-hazard compose into exposure records | SPE-1309 follow-up | Out of slice 7 boundary |
| Segmented population trust / disclosure choice mechanics | [SPE-861](https://linear.app/spectranoir/issue/SPE-861) follow-up | Alternate next step per backlog |

## Validation

- `npm run lint`
- `npm run test:run src/test/cognitiveHazardSimulationTriggerVitals.test.ts src/test/advanceWeek.cognitiveHazardSimulationTriggerVitals.integration.test.ts src/test/advanceWeek.cognitiveHazardSimulationTriggers.integration.test.ts`

## See also

- `planning/spe-1309-unified-engine-slice-5.md` — simulation triggers (shipped)
- `planning/spe-1309-parent-acceptance-review-slice-5.md` — AC row 3 **Partial** grooming
