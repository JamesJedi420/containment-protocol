# SPE-2910 — Deterministic workshop clutter/disorder consequences

| Field               | Value                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2910](https://linear.app/spectranoir/issue/SPE-2910/deterministic-workshop-clutterdisorder-consequences) |
| **Status**          | **Recently shipped** (effective on merge)                                                                     |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)      |
| **Branch**          | `jamesdyedbq/spe-2910-deterministic-workshop-clutterdisorder-consequences`                                    |
| **Base `main` SHA** | `777d4efd7b9ea2c0d328ed56bfb1da81cc7671e3`                                                                    |

## Goal

Consume an authoritative bounded room physical-condition packet through the existing department-workshop week-close path so clutter can reduce staged throughput and severe disorder can durably degrade a completion receipt without creating another room, queue, quality, or incident system.

## Ownership and mapping

- SPE-1060 remains authoritative for normalized room physical condition. `FacilityLayoutRoomRecord.physicalCondition` carries that optional packet through the existing layout persistence boundary.
- SPE-2910 maps authored `med_bay` room condition to `department:emergency-response` only.
- SPE-1028 remains authoritative for workshop queue advancement, quality grading, receipt persistence, and week-close ordering.
- Missing, malformed, or unmapped room condition projects an inspectable `baseline` / `unavailable` result and preserves prior behavior.
- Generic clutter generation remains with SPE-1724; this slice neither generates clutter nor mutates it.

## Deterministic behavior

| Clutter score | Processing                               | Completion quality                                           |
| ------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `< 0.5`       | Existing throughput                      | Existing quality                                             |
| `0.5`–`< 0.8` | Cap the mapped workshop at one work unit | Existing quality                                             |
| `>= 0.8`      | Cap at one work unit                     | `degraded` / `poor_workshop_disorder` / `wrong_kit_assembly` |

The production facility-section graph already gives emergency response adjacent input/output staging and therefore a two-unit path. The disorder cap reduces that exact mapped path to one unit while siblings retain their existing staging and throughput.

The live completion wrapper composes the disorder axis after room contamination and before dependency/equipment/reagent axes. A newly completed severely disordered order stores `operationalConsequence: wrong_kit_assembly` on its immutable receipt. Existing receipts win across replay and save/load, so later cleanup cannot rewrite history.

## Acceptance

- [x] Authored room condition maps deterministically to ordered, cluttered, or disordered state.
- [x] Clutter caps an adjacent two-unit emergency-response tick at one unit.
- [x] Severe disorder produces a durable degraded wrong-kit receipt.
- [x] Unmapped siblings keep baseline throughput and quality.
- [x] Missing and malformed physical condition fail neutral with an inspectable unavailable projection.
- [x] Layout hydration preserves valid condition packets, drops malformed packets, and receipt replay remains immutable after cleanup.
- [x] No second queue, generic clutter source, safety rule, or week-close hook is introduced.

## Validation

- `npm run test:run -- src/test/departmentWorkshopDisorder.contract.test.ts src/test/facilityLayoutPersist.contract.test.ts src/test/departmentWorkshopLiveFacilityQuality.integration.test.ts src/test/departmentWorkshopQueue.test.ts`
- `npx eslint` on changed TypeScript files
- `npm run verify:backlog-handoff`
- `npm run verify:requirements -- --base origin/main`

Parent SPE-1028 remains Backlog until its full acceptance boundary is separately proven.
