# SPE-3189 — Containment-zone outbound screening and hold routing

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-3189](https://linear.app/spectranoir/issue/SPE-3189)                                      |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                            |
| **Branch**        | `jamesdyedbq/spe-3189-containment-zone-outbound-screening-and-hold-routing`                     |
| **Base main SHA** | `c9f2cb8387227cb090781326d0f5a96cafee7b6a`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3189  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-26  
**Continuation:** Hermes single-issue canary (`CP_CANARY_MAX_ISSUES=1`, dispatch `6fdf11329f1e51c29010dffd`)

### Queue state

- Manifest `primary`: SPE-1052; `inProgress`: `[]` at pick; Recently shipped head includes SPE-3188
- SPE coding In Progress at pick: none (open In Progress are DA-* only)
- Clean `main`, no open PRs; policy file matches `origin/main`
- Recommended next step named no concrete eligible leaf (SPE-1052 parent only)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent umbrella |
| SPE-792 | High priority; open child SPE-3415 — parent umbrella |
| SPE-1564 / SPE-3150 | Parents with Linear children |
| SPE-1058 / SPE-1896 / SPE-3181 | James assignee and/or parked remainder |
| SPE-3439 / SPE-3441 / SPE-3452 | Hard prerequisites / blockers |
| SPE-3415 | Blocked by SPE-3390 |
| SPE-3360 / SPE-3406 | Eligible but broader multi-owner programs |
| SPE-3359 | Facility register UI — skip |
| SPE-3440 | Eligible; higher SPE id than SPE-3189 |
| **SPE-3189** | ChatGPT Phase 3/4 SPE-1052 child; childless; no `blockedBy`; SPE-3188 deferred screening here and shipped checkout authorization projection |

### Decision criteria

1. **Priority:** After rejecting SPE-792 (umbrella), remaining eligibles are No priority; SPE-3189 wins lowest SPE id among coherent leaves.
2. **Dependency:** No open `blockedBy`; consumes shipped SPE-292 zoning refs and SPE-3188 checkout authorization projection; SPE-3151 remains exposure-egress owner (route decision only, no parallel exposure state).
3. **Feasibility:** Pure deterministic screening/hold packets + optional durable hold map; targeted domain/persistence tests.
4. **Scope:** Outbound screening decision and hold routing only; no second inventory/custody/zoning/exposure engine.
5. **Architectural readiness:** SPE-292 and SPE-3188 already on `main`.
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-3188 checkout and SPE-292 zoning.
7. **Contradiction review:** SPE-3043 STOP untouched; SPE-3121 hold untouched; SPE-629 remains Duplicate civic checkpoint (not revived).
8. **Prohibitions:** No new issue/child/parent; parent not selected; PR review preserved.

### Eligibility checklist

- Exists in Linear: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no children: true
- AC fit one slice: true
- No open blockedBy: true
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true

## Approved boundary

Deterministic outbound screening in `src/domain/containmentZoneOutboundScreening.ts`:

- Authored egress-screen policies keyed to SPE-292-compatible boundary zone ids
- Direction must be `outbound` (ingress does not inherit egress rules)
- Decisions: `clear` | `secondary_screen` | `hold` | `decontaminate` | `quarantine` | `custody_transfer_required` | `escalate`
- Stable reason codes for every non-clear / conditional outcome
- Exposed actor → `decontaminate` routing toward SPE-3151 without inventing exposure state
- Restricted-asset predicate consumes SPE-3188 authorization projection (authorized may clear that predicate; missing/unauthorized holds)
- Required screening capability unavailable → fail closed without inventory mutation
- Optional durable hold/secondary-screen map on `GameState.facilityOutboundScreenHolds` with idempotent keys
- Hold/quarantine/custody outcomes request follow-up only — they do not delete, confiscate, or relocate inventory
- No standalone checkpoint UI; no SPE-629 revival

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Exposure-duty lifecycle advancement | SPE-3151 | This slice emits `decontaminate` routing only |
| Quarantine storage mutation | SPE-2934 / custody owners | Decision routes; no stock mutation |
| Detector physics / sensing | sensing owners | Capability presence only |
| Standalone screening UI | out of issue | Existing surfaces consume reasons |
| SPE-3439 transfer coordination | SPE-3439 | Distinct custody-transfer transaction |

## Validation

- `npm exec vitest run -- src/test/containmentZoneOutboundScreening.contract.test.ts` (10 passed)
- `npm exec eslint --` on touched TS files (clean)
- `npm run verify:backlog-handoff` (OK)
