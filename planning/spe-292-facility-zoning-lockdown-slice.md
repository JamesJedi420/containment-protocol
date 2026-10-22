# SPE-292 — Facility zoning, access bands, and lockdown response

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                    |
| **Issue**         | [SPE-292](https://linear.app/spectranoir/issue/SPE-292)                            |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                 |
| **Child shipped** | [SPE-2079](https://linear.app/spectranoir/issue/SPE-2079) — Done (proximity-risk)  |
| **Branch**        | `jamesdyedbq/spe-292-facility-zoning-access-bands-and-lockdown-response`            |
| **Base main SHA** | `7c50767ab97164716ecc9860c3884b08158a3296`                                         |

## Approved boundary

Pure caller-owned operational zone packets in `src/domain/facilityZoningLockdown.ts`:

- Distinct zone functions (`public_cover` … `deep_vault`) with different risk bands and minimum access bands (reuses SPE-731 `FACILITY_ACCESS_BANDS`)
- Hazard-isolated test / vault zones, containment alarms, and facility postures (`normal` / `containment_alarm` / `lockdown`)
- Lockdown and containment-alarm rewrite zone-layer circulation (`open` → `staff_only` / `emergency_only` / `sealed`) without pathfinding
- Activity/work policy may suspend without asserting physical impassability (RimWorld Training fold-in)
- Non-contiguous zone membership via optional `contiguousGroupId`
- Legible debug summary lines for zoning + circulation changes
- Fail-closed malformed packets; targeted contract tests

No GameState, week-close, UI, SPE-1095 traversal, SPE-406 entry grammar, or SPE-2081 emergency routing.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Actual traversal / route control | SPE-1095 | Zone policy only |
| Entry / access validation grammar | SPE-406 | Consume later |
| Personnel-class emergency routing | SPE-2081 | Consume later |
| Live facility register UI | SPE-3359 | Pure packets |
| Proximity vs clearance gate | SPE-2079 (Done) | Already shipped child |

## Validation

- `npm exec vitest run -- src/test/facilityZoningLockdown.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
