# SPE-3362 — Site-to-facility conversion rules

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                    |
| **Issue**         | [SPE-3362](https://linear.app/spectranoir/issue/SPE-3362)                          |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                |
| **Branch**        | `jamesdyedbq/spe-3362-site-to-facility-conversion-rules`                            |
| **Base main SHA** | `226a28ce`                                                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-3362  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `226a28ce`)  
**Date:** 2026-10-19  
**Continuation:** Hermes full-task delegation after SPE-3361 merge (PR #4331)

### Queue state

- SPE-3361 Done / PR #4331 @ `226a28ce`; clean main; no open PRs
- Skip SPE-3181 (not one-slice ready), SPE-3359 (UI)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Parent |
| SPE-3361 / SPE-1565 / … | Done |
| SPE-3421 | Eligible; higher SPE id |
| **SPE-3362** | Eligible; five ACs + hazard/permission distinction; pure conversion packets |

## Approved boundary

Pure caller-owned site→facility conversion in `src/domain/siteToFacilityConversion.ts`.

- Conversion recipes preserving site/plot identity
- Blocked/conditional/approved outcomes from claim, hazard confidence, terrain, staffing/materials
- Register/map projection packets for consumers (no duplicate owners)
- Inspectable site-state history after conversion
- No GameState, base-building sandbox, or facility UI

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live register/map wiring | SPE-3359 / map owners | Pure packets only |
| Facility lifecycle kernel | SPE-3380 | Consume, do not redefine |
| Full SPE-3181 recurring requirements | SPE-3181 | Separate Backlog child |

## Validation

- `npm exec vitest run -- src/test/siteToFacilityConversion.contract.test.ts`
- `npm run verify:backlog-handoff`
