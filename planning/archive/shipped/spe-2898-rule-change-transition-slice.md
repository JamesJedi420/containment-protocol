# SPE-2898 — Rule-change transition and grandfathering contract

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** (PR #4456 @ `9c3806b8`) |
| **Issue** | [SPE-2898](https://linear.app/spectranoir/issue/SPE-2898/rule-change-transition-and-grandfathering-contract) |
| **Parent** | [SPE-1734](https://linear.app/spectranoir/issue/SPE-1734/campaign-rules-and-settings-ledger) |
| **Branch** | `jamesdyedbq/spe-2898-rule-change-transition-and-grandfathering-contract` |
| **Base main SHA** | `3782c709` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `3782c709`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-2898  

Linear comment records queue state after SPE-2186 merge, comparison among SPE-1052 children / SPE-3186 / SPE-2898, and eligibility. No new issue/child/parent created.

## Approved boundary

- Pure domain `src/domain/ruleChangeTransitionContract.ts` — transition declarations, policies (`prospective_only` / `grandfather_existing` / `migrate_existing` / `revalidate_at_boundary` / `invalidate_or_reissue`), cohort resolution, structured dispositions, exactly-once markers
- Validation fail-closed on missing family policy; compatibility conflicts routed to SPE-151
- No domain mutation, economy compensation, or GameState field in this slice
- Targeted Vitest `src/domain/ruleChangeTransitionContract.test.ts`

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live GameState wiring of markers onto subjects | SPE-1734 consumers | Contract-first; callers persist markers |
| Domain conversion handlers | Equipment / contract owners (e.g. SPE-2751 precedents) | Resolver returns handler refs only |
| World-law conflict adjudication | SPE-151 | Routed, not resolved here |

## Out of scope

- No universal grandfathering or silent retroactive reinterpretation
- No successor-campaign ruleset transitions
- No generic serializer rewrite
