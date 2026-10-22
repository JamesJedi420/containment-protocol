# SPE-1060 — Room quality, zone value, and facility satisfaction

| Field             | Value                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                       |
| **Issue**         | [SPE-1060](https://linear.app/spectranoir/issue/SPE-1060)                             |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                    |
| **Branch**        | `jamesdyedbq/spe-1060-room-quality-zone-value-and-facility-satisfaction`               |
| **Base main SHA** | `25e77dde544bfc67254bfec68e0f9d7522a4bef4`                                            |

## Approved boundary

Pure caller-owned room quality packets in `src/domain/roomQualityFacilitySatisfaction.ts`:

- Distinct comfort / technicalSuitability / prestige / symbolicFit scores (not one flat number)
- Authoritative physical condition separate from contextual valuation by use context
- Recovery modifiers, work performance modifiers, shared-space pressure, expectation legitimacy, task quality gates
- Optional SPE-3406 cultivation contribution (local, viability-gated; does not lift technical suitability)
- Optional SPE-1066 preference deltas (do not mutate physical condition)
- Fail-closed malformed packets; contract tests

No GameState, UI, interior-design simulator, or cultivation/preference ownership.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Actor preference engine | SPE-1066 | Optional input only |
| Cultivation lifecycle | SPE-3406 | Optional contribution input |
| Cultivation labor upkeep | SPE-1058 | Not owned here |
| Live facility UI | SPE-3359 | Pure packets |

## Validation

- `npm exec vitest run -- src/test/roomQualityFacilitySatisfaction.contract.test.ts`
- `npm run verify:backlog-handoff`
