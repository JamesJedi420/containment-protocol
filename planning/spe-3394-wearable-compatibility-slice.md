# SPE-3394 — Wearable layer and body-region compatibility resolver

| Field             | Value                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **Status**        | **In progress**                                                                            |
| **Issue**         | [SPE-3394](https://linear.app/spectranoir/issue/SPE-3394)                                  |
| **Parent**        | [SPE-145](https://linear.app/spectranoir/issue/SPE-145) — Backlog                          |
| **Branch**        | `jamesdyedbq/spe-3394-wearable-layer-and-body-region-compatibility-resolver`               |
| **Base main SHA** | `261a7b551d21db09ae4a6b18419d920059165e74`                                                 |

## Delegated approval

**Decision:** `delegated_approve` SPE-3394  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit user ship-loop request (Hermes unavailable)

### Queue state

- Manifest `primary`: SPE-1052; SPE-3360 Done (PR #4429 @ `261a7b55`)
- Clean `main`, no open PRs
- Policy matches `origin/main`

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-3439 / SPE-3441 / SPE-3452 | Hard blocked |
| SPE-3451 | Requires UI + construction producers for full AC |
| SPE-3181 | Parked |
| SPE-1052 umbrellas | Rejected |
| **SPE-3394** | SPE-145 leaf; unlocks SPE-3441; clear resolver ACs |

### SPE-120 vocabulary note

SPE-3394 consumes SPE-120 region IDs. No region vocabulary existed on `main`. This slice authors **ID + coverage-group expansion only** in `src/domain/bodyRegion.ts` labeled SPE-120 ownership. Hit selection, mitigation, and injury aftermath remain SPE-120 / SPE-3401 — not implemented here. This is not a parallel anatomy registry.

### Eligibility checklist

All true: exists; not recentlyShipped; not umbrella; ACs fit one slice; no open blockers; slice doc on branch.

### Prohibitions honored

No new Linear issue/relationship; SPE-1052 not selected; PR review/CI mandatory.

## Boundary

- `src/domain/bodyRegion.ts` — SPE-120 canonical region IDs + coverage groups
- `src/domain/wearableCompatibility.ts` — wearable layers + occupancy validation + conflict resolver
- Optional `EquipmentDefinition.wearableOccupancy`; catalog fixtures; `validateAgentLoadoutAssignment` integration
- Docs: `architecture/composited-protective-gear-records.md`, `docs/gear-loadouts-audit.md`
- Recovery/grade fixtures updated for catalog coverage

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Localized hit / armor mitigation / injury | SPE-120 (+ SPE-3401 contradiction) | IDs only this slice |
| Catalog-wide apparel occupancy migration | SPE-145 / content | Fixtures only |
| SPE-3078 preset registry | SPE-3078 | Consumes typed conflicts via assignment; not implemented here |
| PPE demand fulfillment | SPE-3441 | Unblocked after this resolver |

## Validation

- `npx vitest run src/test/wearableCompatibility.contract.test.ts` (+ equipment grade/recovery/loadout suites)
- `npm run lint` (pre-ship)
