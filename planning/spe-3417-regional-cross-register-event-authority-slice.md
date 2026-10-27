# SPE-3417 — Regional cross-register event authority contradiction check

| Field             | Value                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                  |
| **Issue**         | [SPE-3417](https://linear.app/spectranoir/issue/SPE-3417)                             |
| **Parent**        | [SPE-1090](https://linear.app/spectranoir/issue/SPE-1090) — Backlog                    |
| **Branch**        | `jamesdyedbq/spe-3417-contradiction-check-regional-cross-register-event`              |
| **Base main SHA** | `f8c040835bfdbaaedd71999be23e411ef301d33a`                                            |

## Delegated approval

**Decision:** `delegated_approve` SPE-3417  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=a0ec9b87b821caf7e6fc9e4c`)

### Queue state

- Manifest `primary`: SPE-1052; prior `inProgress` SPE-3384 now Done (PR #4426 @ `f8c04083`)
- Clean `main`, no open PRs
- No SPE implementation slice In Progress on Linear (DA-* ignored)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-3439 | Blocked on SPE-2995/SPE-1434; multi-AC broad |
| SPE-3441 | Hard prerequisite SPE-3394 → SPE-120 (Backlog) |
| SPE-3452 | Hard blocked on SPE-1084 |
| SPE-3451 / SPE-3406 / SPE-3360 / SPE-1564 | Multi-owner / incomplete producers |
| **SPE-3417** | Approved contradiction-check evidence boundary; childless; no blockers |

### Eligibility checklist

- Exists / Backlog → In Progress: true
- Not recentlyShipped: true
- Not parent / no children: true
- AC fit one slice (matrix + fixture): true
- No open blockedBy: true
- Slice doc before feature code: true
- Approved contradiction/docs boundary: true

## Approved boundary

- Evidence matrix + overall disposition in `docs/spe-3417-regional-cross-register-event-authority.md`
- Pure catalog `src/domain/regionalCrossRegisterEventAuthority.ts` + focused tests
- No cross-register event engine, GameState schema, or Linear issue creation

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Producer→plot / civic adapters | SPE-3354 / SPE-3357 (future) | Parents not shipped; candidate only |
| Compound multi-family dispatch | SPE-1503 (future) | Parent Backlog; candidate only |
