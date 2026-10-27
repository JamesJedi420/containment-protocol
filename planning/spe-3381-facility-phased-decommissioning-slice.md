# SPE-3381 — Facility phased decommissioning and closure-obligation coordinator (slice 1)

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-3381](https://linear.app/spectranoir/issue/SPE-3381)                                      |
| **Parent**        | [SPE-1564](https://linear.app/spectranoir/issue/SPE-1564) — Backlog (under SPE-1052)            |
| **Branch**        | `jamesdyedbq/spe-3381-facility-phased-decommissioning-and-closure-obligation`                   |
| **Base main SHA** | `6deea463ac1989fbc3d0ea189d1e1e6a91f6d0cf`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3381  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=44bef5d2393c8e340a57bb15`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3153 (Linear **Done**, PR #4414 merged @ `6deea463`); coding queue empty
- SPE coding In Progress at pick: none (open In Progress are DA-* only)
- Clean `main`, no open PRs; policy file matches `origin/main`
- Recommended next step named no concrete eligible leaf (SPE-1052 parent only)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent umbrella |
| SPE-3153 | Done / merged — handoff stale only |
| SPE-3150 / SPE-792 / SPE-1564 | Parents with Linear children |
| SPE-1058 / SPE-1896 / SPE-3181 | James assignee (legacy owner) and/or parked remainder |
| SPE-3439 / SPE-3441 / SPE-3452 | Open `blockedBy` |
| SPE-3451 | Still blocked by SPE-110 + SPE-1564 |
| SPE-3415 | Blocked by SPE-3390 |
| SPE-3385 | Blocked by SPE-2794 |
| SPE-3390 | Blocked by SPE-2273 |
| SPE-3360 / SPE-3406 | Broader multi-owner programs (not one coherent leaf) |
| SPE-3359 | Facility register UI — skip |
| **SPE-3381** | ChatGPT Phase 4 SPE-1564 child; childless; `blockedBy` SPE-3380 **Done**; assignee/delegate absent at pick; coherent decommissioning ACs |

### Decision criteria

1. **Priority:** After rejecting umbrellas/blocked/broader/UI/wrong-owner, SPE-3381 is the coherent one-slice leaf under SPE-1052 via SPE-1564.
2. **Dependency:** SPE-3380 Done clears the only Linear `blockedBy`; missing SPE-3378 custody exits fail closed per issue body.
3. **Feasibility:** Coordinator over SPE-3380 kernel + caller-owned obligation attestations; deterministic tests.
4. **Scope:** Intake-stop → drawdown → final-closure assessment/apply; no custody/transfer/staffing/dependency mutation.
5. **Architectural readiness:** SPE-3380 lifecycle kernel on `main`.
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-3380 construction/activation path and SPE-3385 relocation.
7. **Contradiction review:** SPE-3043 STOP untouched; SPE-3121 hold untouched.
8. **Prohibitions:** No new issue/child/parent; parent umbrella not selected; PR review preserved.

### Eligibility checklist

- Exists in Linear: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no children: true
- AC fit one slice: true
- No open blockedBy: true (SPE-3380 Done)
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true
- Ownership: `delegate` absent; `assignee` absent at pick — no conflicting verified owner

## Approved boundary

Deterministic decommissioning coordinator in `src/domain/facilityDecommissioning.ts` plus two SPE-3380 kernel edges:

- Phases: `intake_stopped` → `drawdown` → `closed` on optional `FacilityInstance.decommissioning`
- Intake stop keeps facility `active` while obligations remain inspectable
- Drawdown invokes `begin_decommission_drawdown` (`active` → `locked`)
- Final closure requires caller-owned custody/transfer/staffing/dependency attestations all `clear`; then invokes `finalize_closure` (`locked` → `inactive`)
- Missing/indeterminate/pending obligations or missing authority fail closed with stable blocker codes; failed attempts mutate no state
- No mutation of custody, transfer, staffing, or dependency source authorities
- No competing lifecycle state machine; SPE-3380 remains the transition owner

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Custody terminal exits | SPE-3378 | Missing authority fails closed |
| Transfer execution | SPE-1020 | Caller-owned attestation only |
| Relocation transaction | SPE-3385 | Separate child; blocked by SPE-2794 |
| Facility register UI | SPE-3359 | Read-only blockers exposed for consumers |
| Broader SPE-1564 paths | SPE-1564 | Damage/takeover/retrofit/abandonment/etc. |

## Validation

- `npm exec vitest run -- src/test/facilityDecommissioning.contract.test.ts src/test/facilityLifecycle.test.ts` (54 passed)
- `npm run verify:backlog-handoff` (OK)
- `npm exec eslint --` on touched TS files
