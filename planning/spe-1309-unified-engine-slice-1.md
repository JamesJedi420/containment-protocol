# SPE-1309 — Unified cognitive hazard engine (slice 1)

One-page implementation plan. Linear: child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — **Unified cognitive hazard engine — exposure state anchor (slice 1)** (create/claim on start). Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** — unified engine AC rows 1–3 not fully met until persistence + wire-up slices.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1309 child — Unified cognitive hazard engine — exposure state anchor (slice 1)                       |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine (umbrella)    |
| **Branch** | `spe-1309-unified-engine-slice-1`                                                                          |
| **Base `main` SHA** | `0db414af`                                                                                          |

## Goal

Smallest deterministic unified cognitive hazard engine domain anchor: shared exposure state model with explicit trigger channels, fear/memetic/memory impairment dimensions, countermeasure posture, and read-side exposure review projection.

## Prerequisite (on `main` @ `0db414af`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Self-censoring info registry | `src/domain/selfCensoringInformationRegistry.ts` (SPE-2108)      |
| Naming-hazard registry | `src/domain/namingHazardDescriptorRegistry.ts` (SPE-2116)          |
| Psychological resilience registry | `src/domain/psychologicalResilienceRegistry.ts` (SPE-1615) |
| Parent grooming      | [SPE-2456](https://linear.app/spectranoir/issue/SPE-2456) / PR #2796 — AC gap table in `planning/spe-1309-parent-acceptance-review-slice-4.md` |

## Gap (pre-slice)

- No shared cross-hazard exposure state model — sibling registries attach independently.
- No engine-level trigger-channel taxonomy (direct perception, recording-mediated, reference/description, memory interaction).
- No unified projection describing agent duty, knowledge integrity, and procedure restriction effects.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `CognitiveHazardExposureRecord` + trigger channel taxonomy in `src/domain/cognitiveHazardEngine.ts` | GameState persistence                         |
| `validateCognitiveHazardExposureRecord` — franchise token scan, failed-countermeasure warning | `advanceWeek` orchestration hook              |
| `projectCognitiveHazardExposureReview` — fear/memetic/memory/countermeasure review bands | Full SPE-1309 parent Done                     |
| `inferTriggerChannelsFromPropagationResistance` sibling attach helper | Sibling registry compose wire-up              |
| Focused tests in `src/test/cognitiveHazardEngine.test.ts`          | UI surfacing                                  |
| Slice doc (this file) + backlog handoff                            | SPE-2108 / SPE-2116 weekly hook changes       |

## Exposure contract (deterministic)

- **Trigger channels** — `direct_perception`, `recording_mediated`, `reference_description`, `memory_interaction`.
- **Pressure dimensions** — `fearPressure` and `memeticExposure` as 0..1 unit scores; `memoryImpairmentBand` as `intact` → `erased`.
- **Countermeasure posture** — `none`, `amnestic_protocol`, `mnestic_reinforcement`, `shielding_active`, `procedure_restricted`, `failed`.
- **Effect flags** — `agentDutyDegraded`, `knowledgeIntegrityDegraded`, `procedureRestrictionActive` on projection (derived + explicit record flags).
- **Sibling attach** — `inferTriggerChannelsFromPropagationResistance` maps SPE-2108 tags without replacing sibling registries.

## SPE-1309 parent AC gaps addressed

| Parent AC | This slice | Met? |
| --- | --- | --- |
| Unified model covering fear pressure, memetic/infohazard exposure, memory impairment, countermeasure interaction | `CognitiveHazardExposureRecord` + `projectCognitiveHazardExposureReview` | **Partial** — domain anchor exists; not persisted or wired |
| Trigger channels explicit | Four-channel taxonomy + sorted projection labels | **Partial** — taxonomy defined; no routing/orchestration |
| Cognitive hazard states affect agents, knowledge, and procedures | Projection flags `agentDutyDegraded`, `knowledgeIntegrityDegraded`, `procedureRestrictionActive` | **Partial** — read-side only; no simulation triggers |
| Narrower cognitive-hazard issues attach without replacing parent | `inferTriggerChannelsFromPropagationResistance` helper | **Partial** — attach helper only |

## Acceptance

- [x] Stable subject fixture validates and projects `stable` review band
- [x] Memetic escalation fixture projects `elevated` band with knowledge degradation
- [x] Failed countermeasure fixture projects `critical` band with duty/procedure flags
- [x] Failed countermeasure without refs yields warning
- [x] Franchise token in label → validation error
- [x] Propagation-resistance attach helper maps SPE-2108 tags to trigger channels
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/cognitiveHazardEngine.ts`                                 |
| Tests  | `src/test/cognitiveHazardEngine.test.ts`                              |
| Plan   | `planning/spe-1309-unified-engine-slice-1.md`, `planning/backlog.md`  |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| GameState persistence + hydrate | SPE-1309 slice 2 | Slice 1 is pure domain anchor only |
| `advanceWeek` exposure tick / sibling compose wire-up | SPE-1309 follow-up | Requires persisted exposure records |
| Agent/knowledge/procedure simulation triggers | SPE-1309 follow-up | Parent AC row 3 runtime effects deferred |
| Full SPE-1309 parent Done | SPE-1309 | Slice 1 satisfies partial parent AC only |

## Validation

- `npm run lint`
- `npm run test:run src/test/cognitiveHazardEngine.test.ts`

## See also

- `planning/spe-1309-parent-acceptance-review-slice-4.md`
- `planning/self-censoring-information-registry-slice-1.md` — sibling attach surface (SPE-2108)
- `src/domain/caseLifecycleStateMachine.ts` — pure domain graph slice-1 pattern (SPE-1310)
