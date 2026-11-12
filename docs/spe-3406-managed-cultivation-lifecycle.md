# SPE-3406 — Managed cultivation lifecycle

## Ownership

`src/domain/managedCultivationLifecycle.ts` owns facility-managed cultivation profiles, instance viability/lifecycle, SPE-3384 growth advancement, SPE-1058 labor demand declaration, harvest handoff envelopes, and SPE-1060 ornamental contribution projection.

## Not owned here

| Concern | Owner |
| --- | --- |
| Wild flora / biome ecology | SPE-118 / SPE-182 |
| Specialist labor semantics | SPE-1058 |
| Storage / stockpile | SPE-1027 |
| Production-chain orchestration | SPE-3360 |
| Room quality scoring | SPE-1060 |
| Facility register UI | SPE-3359 |
| Elapsed-time contract | SPE-3384 |

## Decision notes

- Viability is profile- and environment-dependent (no uniform greenhouse assumption).
- Growth uses SPE-3384 rate updates; fine vs coarse cadence must match for equal elapsed time.
- Labor demand feeds SPE-1058 gates; no cultivation-specific workforce ledger.
- Harvest emits a handoff envelope only — consumers own storage/chain mutation.
- Ornamental profiles may omit harvest output and still contribute local room quality while viable.

## Persistence

`sanitizeManagedCultivationRegistry` is the save/load contract (version 1). Live GameState attachment and week-close advance remain deferred orchestration under SPE-3406 / SPE-45.
