# SPE-3388 — Persist one facility capability unlock

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                      |
| **Issue**         | [SPE-3388](https://linear.app/spectranoir/issue/SPE-3388)                 |
| **GitHub**        | [#4282](https://github.com/JamesJedi420/containment-protocol/issues/4282) |
| **Parent**        | [SPE-792](https://linear.app/spectranoir/issue/SPE-792) — Backlog         |
| **Branch**        | `jamesdyedbq/spe-3388-persist-facility-supported-capability-unlocks-and`  |
| **Base main SHA** | `be0785a576d3f69a1534d77c7d1fa0b17701bc41`                                |

Status and backlog classification describe the merge handoff and take effect on merge. Keep Linear In Progress until review, CI, and merge are verified. Closing this child does not close SPE-792.

## Approved boundary

Persist one facility-supported capability unlock and its liability. `advanceFacilityUpgrades` grants it only when `facility:biohazard-response-lab` completes an upgrade at level 2 or higher. The record is `capability:alert_timing`, liability `dangerous_use`, and the completion week. A second completion does not rewrite it. Missing, in-progress, level-1, and unrelated upgrades do not write it.

Effective use is derived from an SPE-3386 resolution for `capability:alert_timing`. Ready and degraded stay those words. Unavailable, a missing node, or a rejected resolution becomes suspended. Never-unlocked is an absent record. Support loss and later lock do not delete the unlock. Installed `FacilityEffect` values stay on the existing upgrade path. `capability:logistics_freshness` stays the SPE-3387 staffing support node.

SPE-3382 is Done. This slice does not add a second effect ledger, a lifecycle alias, or a workshop gate.

## API

`src/domain/facilityCapabilityUnlock.ts`

| Function                                 | Behavior                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `grantFacilitySupportedCapabilityUnlock` | Write the one record after a qualifying upgrade completion. Otherwise return the same state.             |
| `deriveFacilityCapabilityEffectiveUse`   | Map the durable record and one SPE-3386 resolution to never-unlocked, ready, degraded, or suspended.     |
| `sanitizeFacilityCapabilityUnlock`       | Keep one well-formed record. Drop a missing, duplicate, or malformed packet without inventing an unlock. |

`advanceFacilityUpgrades` calls the grant after the existing level increment and effect merge. Optional `GameState.facilityCapabilityUnlock` is the only new persisted field. Hydration and save stripping use the sanitizer. No `GAME_STORE_VERSION` bump.

## Upstream contracts

SPE-3386 remains the availability projection. SPE-3383 remains the pure kernel. SPE-3387 remains logistics-post validity. Workshop safety and room quality stay on their mappings. Staffing assignment and capacity stay with SPE-3147 and SPE-3135.

## Validation

Focused regression passed **60 tests across three files**: the new unlock contract, facility upgrade progression, and facility lifecycle. ESLint passed on the new domain module, facility upgrade completion, models, hydration, and the contract test. `npm run verify:backlog-handoff` passed.

## Deferred

| Item                                   | Owner                                                     | Why deferred                                       |
| -------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| Further capability unlocks             | [SPE-792](https://linear.app/spectranoir/issue/SPE-792)   | This child persists one exemplar.                  |
| Staffing posts and logistics freshness | [SPE-3387](https://linear.app/spectranoir/issue/SPE-3387) | Separate approved boundary.                        |
| Workshop gates                         | Existing workshop owners                                  | This slice does not read or change those mappings. |
| UI                                     | none in this child                                        | No presentation surface.                           |
