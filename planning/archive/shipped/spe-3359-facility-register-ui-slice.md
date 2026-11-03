# SPE-3359 — Facility register UI

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                   |
| **Issue**         | [SPE-3359](https://linear.app/spectranoir/issue/SPE-3359)              |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog    |
| **Branch**        | `jamesdyedbq/spe-3359-facility-register-ui`                            |
| **Base main SHA** | `2a2dbeb2136a901a9c7294f3626d2334de90928a`                             |

## Delegated approval

**Decision:** `delegated_approve` SPE-3359  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=d45f801dbd5657c67fa6ab40`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3471 (Linear **Done**, PR #4422 @ `2a2dbeb2`)
- Clean `main`, no open PRs
- Recommended next named no concrete eligible SPE-1052 leaf
- No SPE implementation slice In Progress on Linear (DA-* ignored)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 / SPE-792 / SPE-1564 / SPE-3150 | Parent umbrellas |
| SPE-3471 | Done / merged — handoff stale only |
| SPE-3439 / SPE-3441 / SPE-3451 / SPE-3452 / SPE-3385 / SPE-3181 | Open `blockedBy` |
| SPE-1058 / SPE-1896 / SPE-3181 | `delegate` absent; `assignee` James Dye → legacy owner, not Cursor ACP |
| SPE-3360 / SPE-3406 | Broader multi-owner programs (not one coherent leaf) |
| SPE-3417 | Eligible SPE-1090 contradiction check; deferred behind SPE-1052 child rule |
| SPE-3470 | Eligible research definition under SPE-3342; deferred behind SPE-1052 child rule |
| **SPE-3359** | Childless SPE-1052 leaf; no `blockedBy`; coherent register ACs; assignee/delegate null |

### Decision criteria

1. **Priority:** First eligible SPE-1052 child after recent facility domain slices shipped.
2. **Dependency:** No open Linear blockers; reads existing `facilityState` instances.
3. **Feasibility:** Read-only projection + Agency Command surface; no new facility mechanics.
4. **Scope:** One coding slice; missing staffing/site/upkeep fields stay explicit unavailable.
5. **Architectural readiness:** `FacilityInstance` + Agency Command patterns exist on `main`.
6. **Duplication:** Not recentlyShipped; distinct from developer overlay debug dump.
7. **Contradiction:** SPE-3043 / SPE-3121 holds unchanged; no register-origin mutation.
8. **Prohibitions:** No new issue; umbrella not selected; PR review preserved.

### Eligibility checklist

- Exists / Backlog → In Progress: true
- Not recentlyShipped: true
- Not parent / no children: true
- AC fit one slice: true
- No open blockedBy: true
- Slice doc before feature code: true
- Ownership: `delegate` absent; `assignee` absent — description prose not ownership

## Approved boundary

Read-only facility register on Agency Command:

- Project rows from canonical `GameState.facilityState.facilities` instance identities
- Show identity, category/type reference, status/condition, level, installed effect summary when present
- Mark damaged/restricted/decommissioning/inactive/locked facilities as needing attention
- Link site/base context via existing containment-site route without owning site-map state
- Explicit unavailable fields for staffing/upkeep/HP when owners do not expose them on the instance
- No facility lifecycle, production, storage, or staffing mutation from the register

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live staffing counts on register rows | SPE-3134 / SPE-1058 | Not on FacilityInstance |
| True HP / structural damage | SPE-1084 | Separate owner; status/decommission used as condition proxy |
| Site topology / plot links | SPE-1104 / SPE-3354 | Register links base context only |
| Production-chain status columns | SPE-3360 | Separate owner |

## API

`src/features/agency/facilityRegisterView.ts`

| Function | Behavior |
| --- | --- |
| `projectFacilityRegisterView` | Deterministic sorted rows from `facilityState`; empty/missing state → empty register |

## Validation

- Targeted: `npm exec vitest run -- src/features/agency/facilityRegisterView.test.ts`
- `npm run verify:backlog-handoff`
- ESLint on touched files
