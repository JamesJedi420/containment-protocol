# SPE-862 — Message-to-service availability validation

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-862](https://linear.app/spectranoir/issue/SPE-862) |
| **Branch** | `jamesdyedbq/spe-862-message-to-service-availability-validation` |

## Delegated approval

**Decision:** `delegated_approve` SPE-862  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit implementation request (SPE-862 branch from `main` @ `6605a968`)

## Approved boundary

Pure message-to-service availability validation in `src/domain/messageToServiceAvailabilityValidation.ts`:

- Guidance message packet (`messageId`, `recommendedAction`, `requiredServiceCategories`, `audienceProfiles`)
- Consumes SPE-3363 `DistrictServiceRegistry` via `parseDistrictServiceRegistry`, per-record reliability lookup, and `projectServiceDownstreamOutputs`
- `validatePublicGuidanceAgainstServices` → frozen `{ disposition, reasonCodes, audienceResults, serviceChecks }`
- Fail-closed malformed packet/registry; exhaustive action/disposition switches
- Trust-effect **hint** reason code only (`trust_effect:empty_advice_hint`) — does not own SPE-861 trust engine

Vitest coverage in `src/domain/messageToServiceAvailabilityValidation.test.ts`.

No universal service simulator, GameState persistence, crisis comms UI, or Linear issue creation.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| SPE-861 trust/compliance outcomes | SPE-861 | Hint reason only this slice |
| Week-close / message release wire | Future integration slice | Pure validation only |

## Validation

- Targeted: `npx vitest run src/domain/messageToServiceAvailabilityValidation.test.ts`
- `npm run verify:backlog-handoff`
- `npm run lint`
