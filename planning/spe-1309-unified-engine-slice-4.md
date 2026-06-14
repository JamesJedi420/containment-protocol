# SPE-1309 — Unified cognitive hazard engine (slice 4)

One-page implementation plan. Linear: child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — **sibling registry compose wire-up from SPE-2108 persisted maps (slice 4)** (create/claim on start). Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** — unified engine AC rows 1–3 not fully met until runtime effect slices.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1309 child — sibling registry compose wire-up from SPE-2108 persisted maps (slice 4)                   |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine (umbrella)    |
| **Branch** | `spe-1309-unified-engine-slice-4`                                                                          |
| **Base `main` SHA** | `16209ad8`                                                                                          |

## Goal

Wire persisted `selfCensoringInformationRecords` propagation-resistance tags into `cognitiveHazardExposureRecords.activeTriggerChannels` during `advanceWeek` via a pure domain compose pass. Reuses slice 1 `inferTriggerChannelsFromPropagationResistance` and slice 3 `mergePropagationResistanceTriggerChannels` without mutating SPE-2108 / SPE-2116 weekly hooks.

## Prerequisite (on `main` @ `16209ad8`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Engine anchor        | `src/domain/cognitiveHazardEngine.ts` (SPE-1309 slice 1 / PR #2807)    |
| Persistence          | `cognitiveHazardExposureRecords` on `GameState` (slice 2 / PR #2808)   |
| Weekly exposure tick | `applyWeeklyCognitiveHazardExposureTick` (slice 3 / PR #2809)          |
| Sibling registry     | `selfCensoringInformationRecords` (SPE-2108 / SPE-2318)                |
| Compose helper       | `mergePropagationResistanceTriggerChannels` (slice 3)                  |

## Sibling compose contract (slice 4)

- **Hydrated truth only** — compose over persisted maps; no re-sanitize or invalid-drop surfacing.
- **Linkage (explicit)** — exposure record links to self-censoring record when normalized refs match:
  - **`parent_case_ref`** — `cognitiveHazardExposureRecord.subjectRef` equals `selfCensoringInformationRecord.parentCaseRef`.
  - **`info_record_id`** — `cognitiveHazardExposureRecord.subjectRef` equals `selfCensoringInformationRecord.id`.
- **Tag merge** — collect `propagationResistance` tags from all linked sibling records; dedupe and sort before channel inference.
- **Channel merge** — `mergePropagationResistanceTriggerChannels`; deterministic sorted `activeTriggerChannels`.
- **Validation gate** — invalid post-compose candidate preserves source exposure record.
- **No-op** — empty exposure map, empty sibling map, no linked siblings, or no new channels: preserve records unchanged.
- **Ordering** — compose runs after SPE-2108 weekly retention tick and before SPE-1309 slice 3 exposure tick.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `cognitiveHazardSiblingCompose.ts` derive + compose helpers        | Planning mirror UI                            |
| Call compose from `advanceWeek` before exposure tick               | SPE-2108 / SPE-2116 weekly hook changes       |
| Targeted compose unit + `advanceWeek` integration tests            | Full SPE-1309 parent Done                     |
| Slice doc (this file) + backlog handoff                            | Slice 1–3 validation/projection contract edits |
|                                                                    | UI surfacing                                  |

## Acceptance

- [x] Empty sibling map is a no-op without throw
- [x] Linked sibling propagation tags merge into `activeTriggerChannels` with deterministic sort
- [x] Unlinked exposure records unchanged when sibling map populated
- [x] Records preserved when compose adds no new channels
- [x] Invalid post-compose candidate preserves source record
- [x] `advanceWeek` integration matches direct compose output
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/cognitiveHazardSiblingCompose.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/cognitiveHazardSiblingCompose.test.ts`, `src/test/advanceWeek.cognitiveHazardSiblingCompose.integration.test.ts` |
| Plan   | `planning/spe-1309-unified-engine-slice-4.md`, `planning/backlog.md`  |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Agent/knowledge/procedure simulation triggers | SPE-1309 follow-up | Parent AC row 3 runtime effects deferred |
| Planning mirror UI | SPE-1309 follow-up | Mirror follows orchestration pattern |
| Full SPE-1309 parent Done | SPE-1309 | Multiple slices remain |

## Validation

- `npm run lint`
- `npm run test:run src/test/cognitiveHazardSiblingCompose.test.ts src/test/advanceWeek.cognitiveHazardSiblingCompose.integration.test.ts src/test/cognitiveHazardWeeklyOrchestration.test.ts src/test/advanceWeek.cognitiveHazardExposureRecords.integration.test.ts`

## See also

- `planning/spe-1309-unified-engine-slice-3.md` — exposure tick (shipped)
- `planning/mass-anomalous-population-emergence-registry-slice-5.md` — sibling compose wire-up pattern
