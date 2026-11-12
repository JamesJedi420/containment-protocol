# SPE-3363 — Public service and infrastructure degradation resolver

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3363](https://linear.app/spectranoir/issue/SPE-3363) |
| **Branch** | `jamesdyedbq/spe-3363-public-service-and-infrastructure-degradation-resolver` |

## Delegated approval

**Decision:** `delegated_approve` SPE-3363  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit implementation request (SPE-3363 branch)

## Approved boundary

Pure public-service / infrastructure degradation resolver in `src/domain/publicServiceInfrastructureDegradation.ts`:

- Persistent district service reliability records (categories, states, causes, provenance, downstream flags)
- `createDistrictServiceRegistry` / `parseDistrictServiceRegistry` / `serializeDistrictServiceRegistry`
- `applyServiceDegradation` — deterministic authored transition map; fail-closed on malformed input
- `applyServiceRecoveryStep` — `recovering` → `strained` → `functional` (no instant baseline)
- `projectServiceDownstreamOutputs` — guidance, mission, medical, logistics, routing, market, trust flags
- `projectPublicServiceCoexistenceWithDistrictCadence` — caller-owned cadence/crisis stub (does not own SPE-109 / SPE-1485)
- Vitest coverage in `src/domain/publicServiceInfrastructureDegradation.test.ts`

No city simulator, market/trust/message engines, GameState persistence, or Linear issue creation.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Week-close / store persistence wire | Future integration slice | Registry pure-only this slice |
| Live cadence engine ownership | SPE-109 / SPE-1485 | Coexistence projection stub only |

## Validation

- Targeted: `npx vitest run src/domain/publicServiceInfrastructureDegradation.test.ts`
- `npm run verify:backlog-handoff`
- `npm run lint`
