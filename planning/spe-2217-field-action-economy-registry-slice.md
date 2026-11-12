# SPE-2217 — Field action economy registry (slice 1)

| Field               | Value                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                     |
| **Linear**          | [SPE-2217](https://linear.app/spectranoir/issue/SPE-2217/field-action-economy-registry-slice-1)                                                          |
| **Parent**          | [SPE-62](https://linear.app/spectranoir/issue/SPE-62/operational-phase-resolution-pipeline) — stays **Backlog**                                          |
| **Related**         | [SPE-40](https://linear.app/spectranoir/issue/SPE-40/operational-action-budget-and-mission-tradeoffs) — inspect only; do not duplicate mission tradeoffs |
| **Branch**          | `cursor/spe-2217-field-action-economy-36c1`                                                                                                              |
| **Base `main` SHA** | `2e2bf04f881ec68eebd39f568e90a246cd6f0f62`                                                                                                               |

## Pre-coding summary

**Status on `main`:** not implemented. No `fieldActionEconomyRegistry` module. SPE-2930 wiring consumes numeric `actionBudget.remaining` / `freeTrigger` only. SPE-73 is **Done** — do not list it as remaining SPE-62 AC.

**Relevant files:** `src/domain/visualTriggerHazardRegistry.ts` + `src/test/visualTriggerHazardRegistry.test.ts` (validate / fail-closed / frozen-fixture pattern); `src/domain/effectDurationModeRegistry.ts` (compact slice-1 registry); SPE-62 sibling slice docs; `src/domain/volatileActionPhasePipeline.ts` (inspect only); `planning/backlog.md` + `planning/backlog-handoff-manifest.json`.

**Current behavior:** field operations have no authored primary / movement / maneuver taxonomy, no conversion-permission records, and no reduced-capacity limit records. SPE-40 still owns mission-layer action budget. SPE-62 pipeline still owns phase order.

**Expected behavior:** frozen registry records define at least one primary action, movement action, maneuver, and conversion-permission. A reduced-capacity fixture omits a category and projects deterministic slot limits. Validation rejects unknown categories, invalid conversion targets, unconstrained reduced-capacity records, and tabletop action-economy tokens. Invalid records project fail-closed empty availability.

**Boundary:** schema / registry only. No GameState field, hydrate, events, week-close, UI, or per-actor turn runner. Do not attach economy records into `resolveVolatileActionPhasePipeline`.

**Risks:** conversion rules that mint surplus slots; reduced-capacity records that still permit the unrestricted set; overlapping SPE-40 operational budget; leaking persistence or a runner; importing tabletop action names as player-facing canon; recoding SPE-54 / SPE-2900–SPE-2931.

**Validation:** `npm run test:run -- src/test/fieldActionEconomyRegistry.test.ts`, then pipeline tests unchanged, lint, backlog-handoff, format.

**Docs:** this slice doc, `planning/backlog.md`, `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY.md` paragraph — no GameState.

## Boundary

Add `src/domain/fieldActionEconomyRegistry.ts` with authored records for primary action, movement action, maneuver, conversion permissions, and reduced-capacity states. Copy the existing domain registry validate / fail-closed / frozen-fixture pattern. Use CP-neutral category unions (`primary` | `movement` | `maneuver`). Conversion `substitute` is one-to-one and may not target the same category. Conversion `consume` may not produce more target slots than source slots spent. Reduced-capacity records must constrain the unrestricted set (omit a category or lower max total below 3) and must not grant slot limits above the unrestricted baseline.

Do not persist a GameState field. Do not implement a per-actor turn runner. Do not add UI. Do not recode `resolveVolatileActionPhasePipeline` or SPE-2900–SPE-2931 modules. Do not duplicate SPE-40 mission tradeoffs, retries, abandonment, or fast-reaction lanes. Do not start SPE-2218 montage registry. Do not start SPE-2847 orchestration. Do not treat SPE-73 as remaining SPE-62 AC. Do not start SPE-1027 warehouse leftovers. Do not close parent SPE-62 or GitHub #62.

SPE-62 frozen phase spine is an inspect-only consumer this slice. Do not attach economy records into the pipeline.

## Deferred

| Item or mechanic                                         | Owner or prerequisite                                                                                             | Why deferred                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Attach economy records into the volatile-action pipeline | later SPE-62 / wiring child if still needed after SPE-2930                                                        | This slice is schema only; SPE-2930 already consumes numeric action-budget |
| Per-actor turn runner / encounter apply                  | [SPE-2847](https://linear.app/spectranoir/issue/SPE-2847/deterministic-tactical-encounter-runner)                 | Parent SPE-8; orchestration stays out                                      |
| Mission-layer tradeoffs / retries / abandonment          | [SPE-40](https://linear.app/spectranoir/issue/SPE-40/operational-action-budget-and-mission-tradeoffs)             | Distinct operational budget; do not duplicate                              |
| Structured montage operation registry                    | [SPE-2218](https://linear.app/spectranoir/issue/SPE-2218/structured-montage-operation-registry-slice-1)           | Sibling; keep out                                                          |
| Warehouse leftovers                                      | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) | Quarantine / hauling / lots / overflow / misfile / capacity-as-warehouse   |
| Unified outcome bands / single-roll math                 | [SPE-73](https://linear.app/spectranoir/issue/SPE-73/local-confrontation-resolution-with-odds-bands)              | **Done** — keep out of further SPE-62 children                             |

## Acceptance

- Frozen fixtures define one primary, one movement, one maneuver, and one conversion-permission record
- Reduced-capacity fixture omits a category and projects deterministic slot limits (`movement` unavailable; `maxTotalSlots` 2)
- Validation rejects unknown action categories, invalid conversion targets (unknown, same-category, consume surplus), and reduced-capacity records that still permit the unrestricted set
- Invalid reduced-capacity / conversion records project fail-closed empty / illegal, not the unrestricted set
- Player-facing id/label/summary reject tabletop action-economy tokens
- Default registry validates; repeated validation and projection are byte-stable
- No GameState field, hydrate, events, week-close, UI, or pipeline recode
- Parent SPE-62 remains Backlog; do not close GitHub #62

## Validation

- `npm run test:run -- src/test/fieldActionEconomyRegistry.test.ts`
- `npm run test:run -- src/test/volatileActionPhasePipeline.test.ts` (unchanged; keep green)
- `npm run lint -- --quiet`
- `npx prettier --check` on touched files
- `npm run verify:backlog-handoff`
