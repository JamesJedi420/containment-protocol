# SPE-2866 — Live workshop integrity mapping

| Field               | Value                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2866](https://linear.app/spectranoir/issue/SPE-2866/live-workshop-integrity-mapping)                                                                                                                                                                                                                                                                              |
| **GitHub issue**    | [#3604](https://github.com/JamesJedi420/containment-protocol/issues/3604)                                                                                                                                                                                                                                                                                              |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                                                                                                                                                                                                                        |
| **Related owners**  | [SPE-2782](https://linear.app/spectranoir/issue/SPE-2782/deterministic-workshop-equipment-condition-output-quality), [SPE-2792](https://linear.app/spectranoir/issue/SPE-2792/canonical-live-facility-workshop-room-condition-quality-integration), [SPE-2865](https://linear.app/spectranoir/issue/SPE-2865/additional-containment-class-inspection-kernel-interlock) |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                                                                                                                                   |
| **Branch**          | `cursor/spe-2866-live-workshop-integrity-6667`                                                                                                                                                                                                                                                                                                                         |
| **Base `main` SHA** | `4b900a428317190c9dfb0e43dbe851aaadd7f641`                                                                                                                                                                                                                                                                                                                             |

## Goal

Project one authored live blast-door integrity signal into SPE-2782 `equipmentCondition` for exact completed workshop work orders at the existing week-close completion-registration seam. Copy the SPE-2792 derive/compose wrapper. Do not add a second grader, hook, mutation station, store/UI inspect path, SPE-1027 consume, or extra-class barrier zone.

## Selected authoritative path

- Department: `department:field-containment` (valid workshop department; not the SPE-2792 / SPE-2772 biohazard mapping)
- Source instance: `equipment-instance-blast-door-workshop`
- Source class: `blast_door` (class check fail-closed)
- Source field: `containmentIntegrity.deficiency` / in-service via `isContainmentClassInService`
- Existing quality axis: `equipmentCondition`
- Existing degraded reason: `poor_equipment_condition`

## Integrity → equipmentCondition

| Live integrity                                                         | `equipmentCondition`                      |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| `none`                                                                 | `good`                                    |
| `compensating_continue`                                                | `good`                                    |
| `hard_stop`                                                            | `poor`                                    |
| Missing authored instance                                              | `poor`                                    |
| Malformed integrity                                                    | `poor`                                    |
| Wrong class on the authored ID (`pressure_seal`, `interlock`, unknown) | `poor`                                    |
| Unmapped department                                                    | `undefined` (caller-owned axis unchanged) |

SPE-2851 `damaged` / `operational` is not an input.

## Bounded integration

- Adds one pure authored department → blast-door instance mapping.
- Composes only the equipment axis through the existing SPE-2792 wrapper; room, safety, and sibling quality axes stay owned by their current seams.
- Projects only exact completed work-order IDs, deduplicates them, sorts them by code unit, and ignores unknown IDs.
- Uses neutral-good required axes when a mapped work order has no caller-owned quality conditions.
- Keeps `resolveDepartmentWorkshopEquipmentQuality` and the existing completion-outcome registrar as the sole equipment-quality grader and receipt-persistence boundary.
- Preserves existing-receipt precedence so replay and save/load cannot regrade historical output.
- Does not change the `advanceWeek` hook count or call shape.

## Validation plan

Targeted tests cover authored mapping; none / compensating continue / hard-stop / absent / malformed / wrong-class / unmapped; SPE-2851 condition isolation; exact-ID ordering and deduplication; unknown-ID handling; caller-axis preservation; reason precedence; canonical week-close registration; SPE-2792 biohazard room isolation; and save/load replay.

## Boundaries preserved

- No SPE-2782 grader-semantic change (`poor` degrades; good / omitted / malformed stay neutral once derived `good \| poor` reaches the grader)
- No SPE-2771 / SPE-2772 safety projection change
- No SPE-113 mutation stations
- No store/UI inspect or deficiency commands
- No SPE-1027 stock consume
- No extra-class barrier zones; membrane coupling stays blast-door-only and is not this slice's writer
- No SPE-2861 / SPE-2862 command change
- No `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` bump
- Do not reopen SPE-2782, SPE-2792, SPE-2865, SPE-2827, or SPE-2848. Do not pick SPE-2847.

## Deferred

| Item or mechanic                                                 | Owner or prerequisite  | Reason                                                                                                                                                                                          |
| ---------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mutation stations / integrity labor                              | this SPE-877 child     | Shipped: `planning/spe-877-mutation-stations-integrity-labor-slice.md` (Linear ID pending create)                                                                                               |
| Extra-class barrier zones (pressure-seal / interlock membranes)  | later SPE-877 child    | Membrane coupling stays `blast_door` only                                                                                                                                                       |
| Store/UI inspect or deficiency commands                          | later SPE-877 child    | Week-close remains the production inspect path                                                                                                                                                  |
| SPE-1027 stock consume of a named part                           | SPE-1027 / later child | Suitability stays blast-door-only                                                                                                                                                               |
| Additional live quality axes (staff, reagent, input, dependency) | SPE-1028 / SPE-2771    | This child owns only the equipment axis                                                                                                                                                         |
| Mapping additional containment classes into workshop quality     | later SPE-877 child    | This slice is blast-door only                                                                                                                                                                   |
| Seed or materialize `equipment-instance-blast-door-workshop`     | later SPE-877 child    | Mapping fail-closes missing instance (`poor`); `instantiateEquipmentInstance` still allocates `equipment-instance-${week}-${ordinal}`; no startingState seed or save-version bump in this child |

## Parent disposition

SPE-877 remains **Backlog**. Remaining parent AC after live mapping and integrity labor is extra-class barrier zones.

## Acceptance

- Authored mapped department with blast-door `none` or `compensating_continue` produces `equipmentCondition: good` when other axes are otherwise unchanged
- Authored mapped department with blast-door `hard_stop`, missing instance, malformed integrity, or wrong class produces `equipmentCondition: poor` and `poor_equipment_condition` when that axis is the first degraded reason
- Compensating continue is not treated as poor
- SPE-2851 `damaged` / `operational` is not the mapped signal
- Pressure-seal and interlock instances do not satisfy the authored blast-door mapping
- Caller-owned sibling quality axes and established reason precedence remain intact
- Unmapped departments retain caller-owned `equipmentCondition`; SPE-2792 biohazard room mapping remains unchanged
- Duplicate and unknown completed IDs resolve deterministically; sibling work orders stay isolated
- Existing receipts win across replay and save/load
- Canonical week-close uses the existing completion-registration seam without adding or moving a hook
- Parent SPE-877 remains Backlog
