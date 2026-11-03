# SPE-3188 — Restricted-asset field checkout and verified return

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                           |
| **Issue**         | [SPE-3188](https://linear.app/spectranoir/issue/SPE-3188)                                      |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                            |
| **Branch**        | `jamesdyedbq/spe-3188-restricted-asset-field-checkout-and-verified-return`                      |
| **Base main SHA** | `c470e54eee6e03f4a4cfdc33be8d8190f14d9dc6`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3188  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c470e54eee6e03f4a4cfdc33be8d8190f14d9dc6`  
**Date:** 2026-10-26  
**Continuation:** Hermes single-issue canary (`CP_CANARY_MAX_ISSUES=1`, dispatch `209ebd951599a7ebed45f613`)

### Queue state

- Manifest `primary`: SPE-1052; `inProgress`: `[]` at pick; Recently shipped head includes SPE-3438/SPE-3436/SPE-1060
- SPE coding In Progress at pick: none (open In Progress are DA-* only)
- Clean `main`, no open PRs; policy file matches `origin/main`
- Recommended next step named no concrete eligible leaf (SPE-1052 parent only)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent umbrella |
| SPE-1013 | Cursor delegate present, but remaining case/investigation closure boundary ambiguous — fail closed |
| SPE-792 | High priority; not one-slice ready |
| SPE-1564 / SPE-3150 | Parents with Linear children |
| SPE-1058 / SPE-1896 / SPE-3181 | James assignee and/or parked remainder |
| SPE-3439 / SPE-3441 / SPE-3452 | Hard prerequisites / blockers |
| SPE-3360 / SPE-3406 / SPE-3189 / SPE-3440 | Eligible SPE-1052 children; higher SPE ids or broader |
| **SPE-3188** | ChatGPT Phase 4 child; childless; coherent checkout ACs; lowest eligible SPE among priority-tied primary children |

### Decision criteria

1. **Priority:** After rejecting SPE-792 (not one-slice), remaining eligibles are No priority; SPE-3188 wins lowest SPE id.
2. **Dependency:** No open `blockedBy`; consumes shipped SPE-2911.
3. **Feasibility:** Deterministic checkout registry + SPE-2911 restore seam; targeted domain/persistence tests.
4. **Scope:** Temporary field checkout + verified return only; no second inventory/custody engine.
5. **Architectural readiness:** SPE-2911 release modes already on `main`.
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-2911 custody/release modes.
7. **Contradiction review:** SPE-3043 STOP untouched; SPE-3121 hold untouched; RimWorld C903 fold preserved.
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

Deterministic restricted-asset field checkout lifecycle in `src/domain/restrictedAssetFieldCheckout.ts` plus SPE-2911 restore seam:

- Optional `GameState.facilityRestrictedAssetCheckouts` keyed by stable checkout id
- Authorize → check out (SPE-2911 `stored` → `inspection`) → present return → independent verify → closed (SPE-2911 restore to `stored`)
- Overdue, lost, compromised, and return-rejected failure branches; non-`closed` outcomes keep the set reserved
- Unauthorized / incomplete set / ineligible verifier fail closed with no partial mutation
- Idempotent repeated present/verify/reject/fail processing
- Save/load via existing hydrate path; SPE-2911 regression remains green
- Read-only outbound authorization projection for SPE-3189 consumers (no screening implementation here)

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Containment-zone outbound screening integration | SPE-3189 | Separate child; this slice only exposes authorization projection |
| Standalone checkout UI | out of issue | Existing surfaces only |
| Evidence-custody / ordinary-equipment field-deploy adapters | SPE-867 / SPE-3142 | Consume later when those paths need checkout predicates |

## Validation

- `npm exec vitest run -- src/test/restrictedAssetFieldCheckout.contract.test.ts src/test/facilityRestrictedObjectRelease.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
