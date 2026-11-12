# SPE-1309 — Unified cognitive hazard engine (slice 5)

One-page implementation plan. Linear: child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — **agent/knowledge/procedure simulation triggers (slice 5)** (create/claim on start). Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** — unified engine AC rows 1–3 not fully met until planning mirror UI slice.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1309 child — agent/knowledge/procedure simulation triggers (slice 5)                                   |
| **Status** | **Shipped** — PR #2811 @ `8f5fde47`                                                                        |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine (umbrella)    |
| **Branch** | `spe-1309-unified-engine-slice-5`                                                                          |
| **Base `main` SHA** | `a51d784d`                                                                                          |

## Goal

Consume composed `activeTriggerChannels` and projected effect flags (`agentDutyDegraded`, `knowledgeIntegrityDegraded`, `procedureRestrictionActive`) to drive deterministic simulation side-effects during `advanceWeek` weekly report surfacing and read-side subject routing — without mutating SPE-2108 / SPE-2116 weekly hooks or slice 1–4 compose/tick contracts.

## Prerequisite (on `main` @ `a51d784d`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Engine anchor        | `src/domain/cognitiveHazardEngine.ts` (SPE-1309 slice 1 / PR #2807)    |
| Persistence          | `cognitiveHazardExposureRecords` on `GameState` (slice 2 / PR #2808)   |
| Weekly exposure tick | `applyWeeklyCognitiveHazardExposureTick` (slice 3 / PR #2809)          |
| Sibling compose      | `composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords` (slice 4 / PR #2810) |
| Surfacing pattern    | `welfareDebtAccountingCrossLinkWeeklyReportNotes`, coercive reconciliation notes |

## Simulation trigger contract (slice 5)

- **Inputs** — post-compose + post-tick `cognitiveHazardExposureRecords`; optional prior-week map for terminal guard.
- **Resolution** — `projectCognitiveHazardExposureReview`; require non-empty `activeTriggerChannels` and at least one effect flag.
- **Kinds** — `agent_duty_degraded`, `knowledge_integrity_degraded`, `procedure_restriction_active`.
- **Terminal guard** — `memoryImpairmentBand === 'erased'` with prior also `erased` does not re-trigger.
- **Subject grouping** — multiple records for one `subjectRef` merge with deterministic sorted record ids and channel/kind unions.
- **Read-side routing** — `listCognitiveHazardSimulationTriggersForSubjectRef` uses slice 4 normalized ref keys.
- **Weekly surfacing** — deterministic report notes after exposure tick; no new persistence fields.
- **Redaction** — note content uses safe projection labels only; no hidden truth beyond registry projections.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `cognitiveHazardSimulationTriggers.ts` resolve + subject grouping  | Planning mirror UI                            |
| Surfacing + weekly report note builder                             | SPE-2108 / SPE-2116 weekly hook changes       |
| Call from `advanceWeek` after exposure tick                        | Slice 1–4 validation/projection/compose edits |
| Targeted domain + `advanceWeek` integration tests                  | Full SPE-1309 parent Done                     |
| Slice doc (this file) + backlog handoff                            | Agent vitals mutation                         |

## Acceptance

- [x] Empty exposure map is a no-op without throw
- [x] Post-tick records with effect flags + channels resolve deterministic trigger kinds
- [x] Terminal erased records do not re-trigger on subsequent weeks
- [x] Multiple records for one subject merge with deterministic ordering
- [x] `advanceWeek` integration matches direct trigger note builder output
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/cognitiveHazardSimulationTriggers.ts`, `src/domain/cognitiveHazardSimulationTriggerSurfacing.ts`, `src/domain/cognitiveHazardSimulationTriggerWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Tests  | `src/test/cognitiveHazardSimulationTriggers.test.ts`, `src/test/advanceWeek.cognitiveHazardSimulationTriggers.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts` |
| Plan   | `planning/spe-1309-unified-engine-slice-5.md`, `planning/backlog.md`  |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Planning mirror UI | SPE-1309 follow-up | Mirror follows orchestration + trigger surfacing |
| Agent vitals / scoring side-effects from triggers | SPE-1309 follow-up | Slice 5 surfaces via report notes only |
| Full SPE-1309 parent Done | SPE-1309 | Mirror slice may remain |

## Validation

- `npm run lint`
- `npm run test:run src/test/cognitiveHazardSimulationTriggers.test.ts src/test/advanceWeek.cognitiveHazardSimulationTriggers.integration.test.ts src/test/advanceWeek.cognitiveHazardExposureRecords.integration.test.ts src/test/advanceWeek.cognitiveHazardSiblingCompose.integration.test.ts src/test/reportNoteTypeAudit.test.ts`

## See also

- `planning/spe-1309-unified-engine-slice-4.md` — sibling compose (shipped)
- `planning/self-censoring-information-registry-slice-4.md` — mirror UI template (SPE-2330)
