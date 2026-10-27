# SPE-3360 — Facility production chain

## Ownership

`src/domain/facilityProductionChain.ts` owns authored production-chain variants, stage resolution, recirculation anti-self-generation guards, SPE-1058 labor consumption, SPE-1027 material handoff envelopes, and inspectable status projection for register consumers.

## Not owned here

| Concern | Owner |
| --- | --- |
| Storage / stockpile mutation | SPE-1027 |
| Specialist labor registry semantics | SPE-1058 |
| Facility dependency graph | SPE-3383 / SPE-792 |
| Temporary site-material crafting | SPE-1657 |
| Permanent gear mutation stations | SPE-113 |
| Facility register UI | SPE-3359 |
| Managed cultivation instances | SPE-3406 |

## Decision notes

- Chain variants are authored configurations with distinct throughput/logistics/utility profiles for the same output class.
- Stage evaluation is caller-owned (roles, stock snapshot, dependency availability, operators).
- Recirculation requires an external catalyst each cycle and applies authored loss; catalyst absence fails as `self_generation_blocked`.
- Handoffs mark `facilityProduced: true` and `outputKind: facility_durable` so facility outputs stay distinct from field improvisation.

## Persistence

`sanitizeFacilityProductionChainRegistry` is the save/load contract (version 1). Live GameState attachment remains deferred orchestration under SPE-3360 / SPE-1052.
