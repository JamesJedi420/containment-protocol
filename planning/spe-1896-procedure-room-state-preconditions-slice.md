# SPE-1896 — Procedure room-state preconditions and facility-configuration safety

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-1896](https://linear.app/spectranoir/issue/SPE-1896) |
| **Parent** | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) |
| **Branch** | `jamesdyedbq/spe-1896-procedure-room-state-preconditions-and-facility` |
| **Base main SHA** | `847ea30b5ffc1a9c85ac2f9345ecebb3bb89681e` |

## Delegated approval

**Decision:** `delegated_approve` SPE-1896  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit parent-agent implementation request (SPE-1896 bounded domain slice)

### Queue state

- Manifest `primary`: SPE-1052; SPE-3180 prior in-progress slice handed off to Recently shipped
- Clean `main` at branch create @ `847ea30b`
- Branch created before audit evidence

### Eligibility checklist

All true for bounded pure-domain precondition contract (parent umbrella; child SPE-2771 already shipped).

### Prohibitions honored

No new Linear issue/relationship; no SPE-874 permit engine; no SPE-2771 projection ownership expansion; PR review/CI mandatory when shipped.

## Approved boundary

- Frozen contract `src/domain/procedureRoomStatePreconditions.ts` — compact `ProcedureSafetyRequirement` records, caller-owned `RoomStateSnapshot` / `FacilityConfigurationSnapshot`, `evaluateProcedureRoomStateSafety`, stable reason codes, fail-closed malformed/unknown refs
- Vitest `src/domain/procedureRoomStatePreconditions.test.ts` — precondition lookup, room-state block, facility-configuration mismatch, safe proceed
- SCHEMA_REGISTRY evidence-only note
- References existing `FacilityRoomId` / `FacilityZoneId` from SPE-1026 layout kernel (no parallel geometry)
- No GameState field, week-close hook, or full facility simulator

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Live GameState room-state projection | Future SPE-1896 follow-up | Contract-only this slice |
| SPE-874 permit engine integration | SPE-874 | Out of boundary |
| Workshop PPE/dualAuth live projection | SPE-2771 | Already shipped; not re-owned here |

## Validation

- `npx vitest run src/domain/procedureRoomStatePreconditions.test.ts`
- `npm run verify:backlog-handoff`
- `npm run lint`
