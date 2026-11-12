# SPE-1343 — Truth-layer record registry GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2448](https://linear.app/spectranoir/issue/SPE-2448) (child under [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343)). Follows shipped [SPE-2447](https://linear.app/spectranoir/issue/SPE-2447) slice 1 (`planning/truth-layer-record-registry-slice-1.md`, PR #2772).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2448 — Truth-layer record registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2448) |
| **Parent** | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) — Public myth operational truth split; stays **Backlog** |
| **Branch** | `spe-1343-truth-layer-record-registry-slice-2`                                                             |
| **Status** | **Shipped** — PR #2774 @ `17f770c1`                                                                       |
| **Base `main` SHA** | `9e050dd0`                                                                                          |

## Goal

Persist validated `TruthLayerRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Reuse `AuthoritySourceConfidence` (SPE-677) and `KnowledgeTier` (SPE-58) at runtime where records reference them.

## Prerequisite (on `main` @ `9e050dd0`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/truthLayerRecordRegistry.ts` (SPE-2447 / PR #2772)         |
| Fixtures             | `COMPETING_TRUTH_LAYERS_FIXTURE`, `ACTOR_TRUTH_LAYER_FIXTURE`          |
| Sibling persistence  | `publicDisclosureRecords` (SPE-2325 / PR #2517)                        |
| Source-confidence vocabulary | `AuthoritySourceConfidence` in `src/domain/authorityGraph.ts` (SPE-677) |
| Knowledge-state vocabulary | `KnowledgeTier` in `src/domain/knowledge.ts` (SPE-58)                  |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `truthLayerRecords` on `GameState`                                  | Weekly orchestration hook                     |
| `sanitizeTruthLayerRecords` + `runTransfer` hydrate wire             | Mirror UI                                     |
| `validateTruthLayerRecord` on hydrate; drop invalid, no throw       | Myth-as-infrastructure ops projection (priority 2) |
| Default `{}` in `createStartingState`                              | SPE-1343 parent Done                          |
| Sanitize unit tests + save/import round-trip (byte-stable)         | PublicDisclosureRecord extensions             |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] `competingLayers` / slot fields byte-stable after round-trip
- [x] Runtime wire-up: `AuthoritySourceConfidence` + `KnowledgeTier` on hydrated slots
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/truthLayerRecordRegistry.ts`, `src/domain/models.ts`    |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/truthLayerRecordRegistry.test.ts`                           |
| Plan   | `planning/truth-layer-record-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly truth-layer progression hook | SPE-1343 slice 3+ | Persistence must land before orchestration |
| Myth-as-infrastructure ops projection | SPE-1343 follow-up | Parent AC row 2; depends on persisted records |
| Planning mirror UI | SPE-1343 slice 4+ | Mirror follows persistence pattern |
| Cover narrative + agency operational record dual-incident pairing | SPE-899 / SPE-1347 | Parent AC row 4 partial |
| Historical-icon normalcy pressure review surfaces | SPE-1343 follow-up | Parent AC row 5 |

## See also

- `planning/truth-layer-record-registry-slice-1.md`
- `planning/public-disclosure-state-registry-slice-2.md` — persistence pattern (SPE-2325)
- `src/domain/publicDisclosureStateRegistry.ts` — sibling registry; do not extend for truth layers
