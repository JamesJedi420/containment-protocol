# SPE-3440 — Construction-stage accessibility and worksite isolation validation

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-3440](https://linear.app/spectranoir/issue/SPE-3440)                                      |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                            |
| **Branch**        | `jamesdyedbq/spe-3440-construction-stage-accessibility-and-worksite-isolation`                  |
| **Base main SHA** | `24428023b320fa2e6b5cbe44344cc6c9c4b79b6f`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3440  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-26  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=adb4d265b453a5b4d2874122`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3189 (Linear **Done**, PR #4403 merged @ `24428023`); treat coding queue empty
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
| SPE-3439 / SPE-3441 / SPE-3452 / SPE-3451 | Open `blockedBy` |
| SPE-3415 | Blocked by SPE-3390 |
| SPE-3360 / SPE-3406 | Broader multi-owner programs (not one coherent leaf) |
| SPE-3359 | Facility register UI — skip |
| SPE-3189 | Done / merged — handoff stale only |
| **SPE-3440** | ChatGPT Phase 1–4 SPE-1052 child; childless; no `blockedBy`; assignee/delegate absent (no conflicting verified owner); coherent accessibility ACs |

### Decision criteria

1. **Priority:** After rejecting umbrellas/blocked/James-parked, SPE-3440 is the coherent eligible leaf previously deferred only for higher SPE id than SPE-3189.
2. **Dependency:** No open `blockedBy`; SPE-2932 shipped; SPE-1095/SPE-110 remain Backlog — consume caller-owned reachability/adjacency facts and construction-step ids without inventing movement physics or claiming SPE-110 complete.
3. **Feasibility:** Pure prospective feasibility resolver + targeted contract tests; no GameState required for slice-1.
4. **Scope:** Construction-stage accessibility / isolation validation only; no second pathfinder, graph, or construction engine.
5. **Architectural readiness:** SPE-2932 topology identities on `main`; SPE-3021/3022 stay conditional (non-mutating resolver).
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-110 progress clocks and SPE-2932 placement kernel.
7. **Contradiction review:** SPE-3043 STOP untouched; SPE-3121 hold untouched; C19/C20 remain existing-owner checks.
8. **Prohibitions:** No new issue/child/parent; parent not selected; PR review preserved.

### Eligibility checklist

- Exists in Linear: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no children: true
- AC fit one slice: true (pure resolver satisfying six ACs)
- No open blockedBy: true
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true
- Ownership: `delegate` absent; `assignee` absent — no conflicting verified owner; description prose not used as ownership

## Approved boundary

Deterministic construction-stage accessibility in `src/domain/constructionStageAccessibility.ts`:

- Caller-owned base topology (nodes + undirected adjacency), ordered construction steps, occupants, and temporary access provisions
- Evaluate each step against **hypothetical post-prior-step** geometry without mutating authored topology
- Outcomes: `permitted` | `blocked` | `unsafe` with stable reason codes and affected step/route
- Detect intermediate orders that remove required work access; prove reorder can yield a permitted sequence
- Detect occupant/worker isolation (lost egress) as `unsafe`
- Temporary access may enable a step while active; after removal, permanent required routes must remain valid
- Do not invent SPE-1095 movement physics, SPE-110 completion, or SPE-3021/3022 persistence
- No standalone construction UI; no second work-order engine

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live SPE-1095 thoroughfare physics | SPE-1095 | Caller-owned reachability/adjacency only |
| Full SPE-110 hauling/progress acceptance debt | SPE-110 | Step ids/progress refs consumed as caller facts |
| Persisted live topology deltas | SPE-3021 / SPE-3022 | Non-mutating resolver; conditional only |
| Facility register presentation | SPE-3359 | Reasons exposed for consumers |
| Layout pattern application | SPE-3451 | Blocked on this leaf + others |

## Validation

- `npm exec vitest run -- src/test/constructionStageAccessibility.contract.test.ts` (10 passed)
- `npm exec eslint --` on touched TS files
- `npm run verify:backlog-handoff` (OK)
