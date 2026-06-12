# SPE-1343 — Truth-layer weekly orchestration hook (slice 3)

One-page implementation plan. Linear: [SPE-2449](https://linear.app/spectranoir/issue/SPE-2449) (child under [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343)). Follows shipped [SPE-2448](https://linear.app/spectranoir/issue/SPE-2448) slice 2 (`planning/truth-layer-record-registry-slice-2.md`, PR #2774).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2449 — Truth-layer weekly orchestration hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2449) |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Public myth / operational truth split; stays **Backlog** |
| **Branch** | `spe-1343-truth-layer-record-registry-slice-3`                                                             |
| **Status** | In progress                                                                                                |
| **Base `main` SHA** | `f9a66c4c`                                                                                          |

## Goal

Wire persisted `truthLayerRecords` into `advanceWeek` with a weekly orchestration hook that projects myth-as-infrastructure ops signals (`mythInfrastructureActive`, `correctionPressure`, `mythDrivesOpsWithoutVerification`) without collapsing claim, doctrine, and verification layers. Mirror the SPE-2326 disclosure progression orchestration pattern and the SPE-1882 coercive-protocol weekly snapshot pattern.

## Prerequisite (on `main` @ `f9a66c4c`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/truthLayerRecordRegistry.ts` (SPE-2447 / PR #2772)         |
| Persistence          | `truthLayerRecords` on `GameState` (SPE-2448 / PR #2774)               |
| Review projection    | `projectTruthLayerReviewView` (slice 1)                                |
| Sibling weekly hook  | `applyWeeklyPublicDisclosureProgressionTick` (SPE-2326 / PR #2519)     |
| Snapshot pattern     | `applyWeeklyCoerciveProtocolTick` (SPE-1882 slice 3/5)                |

## Orchestration contract (slice 3)

- **Ops projection** — `projectTruthLayerOpsView(record)` derives myth infrastructure, correction pressure, and layer divergence from separate truth layers; does not collapse claim/doctrine/verification.
- **Weekly tick** — `applyWeeklyTruthLayerTick(records, week, snapshots)` preserves source records byte-stable; persists `truthLayerWeeklyProjectionSnapshots` keyed by record id.
- **No-op** — empty `truthLayerRecords` map; re-tick same week is idempotent.
- **Does not** — extend `PublicDisclosureRecord`, mutate truth-layer record fields, or add mirror UI.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `projectTruthLayerOpsView` + snapshot types in registry module         | SPE-1343 parent Done                          |
| `applyWeeklyTruthLayerTick` in `truthLayerWeeklyOrchestration.ts`      | Planning mirror UI (slice 4+)                 |
| `truthLayerWeeklyProjectionSnapshots` on `GameState` + hydrate wire    | Public-disclosure registry runtime changes    |
| Call from `advanceWeek` after week increment (`result.week`)           | Cover narrative dual-incident pairing         |
| Targeted domain + `advanceWeek` integration tests                      | Mission triage expansion                      |
| Slice doc (this file) + backlog handoff                              | Historical-icon normalcy pressure surfaces    |

## Acceptance

- [x] Empty `truthLayerRecords` map is a no-op without throw
- [x] Fixture records byte-stable through `advanceWeek` tick
- [x] Weekly ops snapshots persist `mythInfrastructureActive` and `correctionPressure` without collapsing layers
- [x] Re-applying tick for same post-advance week is idempotent
- [x] `validateTruthLayerRecord` byte-stable validation unchanged from slice 1
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/truthLayerRecordRegistry.ts`, `src/domain/truthLayerWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/truthLayerWeeklyOrchestration.test.ts`, `src/test/advanceWeek.truthLayerRecords.integration.test.ts`, `src/test/truthLayerRecordRegistry.test.ts` |
| Plan   | `planning/truth-layer-record-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Planning mirror UI for truth-layer review | SPE-1343 slice 4+ | Mirror follows orchestration pattern |
| Cover narrative + agency operational record dual-incident pairing | SPE-899 / SPE-1347 | Parent AC row 4 partial |
| Historical-icon normalcy pressure review surfaces | SPE-1343 follow-up | Parent AC row 5 |
| Disclosure campaign player UI / post-secrecy orchestration | SPE-1343 / SPE-861 | Parent scope |

## See also

- `planning/truth-layer-record-registry-slice-2.md`
- `planning/public-disclosure-state-registry-slice-3.md` — sibling weekly hook pattern (SPE-2326)
- `src/domain/coerciveContainedPersonProtocolWeeklyOrchestration.ts` — snapshot orchestration pattern
