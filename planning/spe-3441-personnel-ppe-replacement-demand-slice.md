# SPE-3441 — Personnel PPE replacement-demand and authorized fulfillment (slice 1)

| Field             | Value                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **Status**        | **In progress**                                                                            |
| **Issue**         | [SPE-3441](https://linear.app/spectranoir/issue/SPE-3441)                                  |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                          |
| **Branch**        | `jamesdyedbq/spe-3441-personnel-ppe-replacement-demand-and-authorized-fulfillment`         |
| **Base main SHA** | `4931a15e30eed189b892f61ab35560c3de1a6399`                                                 |

## Delegated approval

**Decision:** `delegated_approve` SPE-3441  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit user ship-loop request (Hermes unavailable)

### Queue state

- Manifest `primary`: SPE-1052; SPE-3394 Done (PR #4430 @ `4931a15e`)
- Clean `main` at pick; handoff SPE-3394 closeout carried onto this branch
- No open PRs

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| **SPE-3441** | Winner — SPE-3394 hard prereq Done; PPE demand leaf |
| SPE-3439 / SPE-3452 | Hard blocked |
| SPE-3451 | Defer — larger UI/construction AC bar |
| SPE-1052 umbrellas | Rejected |

### Eligibility checklist

All true.

### Prohibitions honored

No new Linear issue/relationship; SPE-1052 not coding slice; PR review/CI mandatory.

## Boundary

- Pure demand/deficit resolver over authored role/kit PPE requirements + actual assignment/serviceability/stock
- Authorized fulfillment command routing through canonical `equipAgentItem` / loadout validation (incl. SPE-3394)
- Consume SPE-3394 wearable legality; do not invent replacement-specific compatibility
- One existing readiness/personnel surface consumes deficit/result packets
- Fixtures + tests + in-boundary docs; additive persistence only if durable request identity is required

## Implementation

- Domain: `src/domain/personnelPpeReplacementDemand.ts` (fixture medic→`hazmat_suit` / biocontainment)
- Store: `authorizePersonnelPpeFulfillment` on game store
- Surface: Equipment loadout `ppeDemands` + Authorize replacement (`EquipmentPage` / `equipmentView`)
- Docs: `docs/gear-loadouts-audit.md`
- Tests: `src/test/personnelPpeReplacementDemand.contract.test.ts`
- No new persisted outstanding-request fields (transient demand IDs derived)

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Auto-procurement / market spend | Existing market owners | Explicitly excluded |
| SPE-877 full integrity formulas | SPE-877 | Consume serviceability signals only |
| Standalone PPE management UI | — | Excluded; use existing surface |
