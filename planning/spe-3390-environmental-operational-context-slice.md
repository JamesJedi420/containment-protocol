# SPE-3390 — Environmental operational-context composition resolver

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                           |
| **Issue**         | [SPE-3390](https://linear.app/spectranoir/issue/SPE-3390)                                      |
| **Parent**        | [SPE-1090](https://linear.app/spectranoir/issue/SPE-1090) — Backlog                             |
| **Branch**        | `jamesdyedbq/spe-3390-environmental-operational-context-composition-resolver`                  |
| **Base main SHA** | `4eb3b291028d2c202b7910fb3dde78b2b8fbfcf6`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3390  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=b37af24cbd59f697ac7a2380`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-2273 (Linear **Done**, PR #4418 @ `4eb3b291`)
- Clean `main`, no open PRs
- Recommended next named no concrete eligible SPE-1052 leaf

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent |
| SPE-2273 | Done / merged — handoff stale only |
| SPE-3439 / SPE-3441 / SPE-3451 / SPE-3452 / SPE-3385 | Open `blockedBy` |
| SPE-3415 | Blocked by SPE-3390 |
| SPE-3471 | Unblocked alternate; deferred so SPE-3390 unlocks facility SPE-3415 first |
| **SPE-3390** | Childless; `blockedBy` SPE-2273 Done; coherent caller-owned composition ACs |

### Eligibility checklist

- Exists / Backlog → In Progress: true
- Not recentlyShipped: true
- Not parent / no children: true
- AC fit one slice: true
- No open blockedBy: true (SPE-2273 Done)
- Slice doc before feature code: true
- Ownership: delegate/assignee absent at pick

## Approved boundary

Pure deterministic resolver in `src/domain/environmentalOperationalContext.ts`:

- Caller-owned dimension packets tagged with owner ids (terrain/climate/ecology/feature/hazard) — no second env simulation
- Deterministic scope precedence: temporary > exceptional > local > regional > baseline
- SPE-2273 composition/translation trace on resolved context
- Subset projection for downstream consumers
- Fail/degrade with stable reasons on conflict/invalid inputs
- Byte-stable repeated resolution
- No GameState persistence, UI, or map/facility ownership

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Facility env → dependency projection | SPE-3415 | Blocked by this slice |
| Authoritative climate/terrain/ecology implementations | SPE-1221 / SPE-3354 / SPE-1117 / … | Consumed as caller-owned contracts only |
| Information-source access projection | SPE-3471 | Separate SPE-1090 child |

## Validation

- Targeted: `npm exec vitest run -- src/test/environmentalOperationalContext.test.ts` (7 passed; SPE-2273 suite still green)
- `npm run verify:backlog-handoff` (OK)
- `npm exec eslint --` on touched TS files (clean)
