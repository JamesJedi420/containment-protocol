# SPE-3153 — Critical asset supportability state resolver (slice 1)

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-3153](https://linear.app/spectranoir/issue/SPE-3153)                                      |
| **Parent**        | [SPE-3150](https://linear.app/spectranoir/issue/SPE-3150) — Backlog (under SPE-1052)            |
| **Branch**        | `jamesdyedbq/spe-3153-critical-asset-supportability-state-resolver-slice-1`                      |
| **Base main SHA** | `adcb281a61a3caa2baf717317f5d9d9cb1ab7971`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3153  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-26  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=905a24116d387aacb720875b`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3440 (Linear **Done**, PR #4413 merged @ `adcb281a`); coding queue empty
- SPE coding In Progress at pick: none (open In Progress are DA-* only)
- Clean `main`, no open PRs; policy file matches `origin/main`
- Recommended next step named no concrete eligible leaf (SPE-1052 parent only)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent umbrella |
| SPE-792 / SPE-1564 / SPE-3150 | Parents with Linear children |
| SPE-1058 / SPE-1896 / SPE-3181 | James assignee and/or parked remainder |
| SPE-3439 / SPE-3441 / SPE-3452 | Open `blockedBy` |
| SPE-3451 | Still blocked by SPE-110 + SPE-1564 (SPE-3440 Done does not unlock alone) |
| SPE-3360 / SPE-3406 | Broader multi-owner programs (not one coherent leaf) |
| SPE-3359 | Facility register UI — skip |
| SPE-3440 | Done / merged — handoff stale only |
| **SPE-3153** | ChatGPT Phase 4 SPE-3150 slice-1 child; childless; no `blockedBy`; assignee/delegate absent; coherent supportability ACs |

### Decision criteria

1. **Priority:** After rejecting umbrellas/blocked/broader/UI, SPE-3153 is the coherent one-slice leaf under SPE-1052 program (via SPE-3150).
2. **Dependency:** No open `blockedBy`; consumes caller-owned supply/competency/knowledge/compatibility facts without inventing SPE-1322/1059/58 engines.
3. **Feasibility:** Pure deterministic resolver + contract tests; no GameState required for slice-1.
4. **Scope:** Supportability assessment only; integrity remains orthogonal; no retirement/procurement mutation.
5. **Architectural readiness:** SPE-877 integrity and SPE-1027 stockpile already on `main` as independent authorities.
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-877 condition and SPE-1027 stock.
7. **Contradiction review:** SPE-3043 STOP untouched; SPE-3121 hold untouched.
8. **Prohibitions:** No new issue/child/parent; parent umbrella not selected; PR review preserved.

### Eligibility checklist

- Exists in Linear: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no children: true
- AC fit one slice: true
- No open blockedBy: true
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true
- Ownership: `delegate` absent; `assignee` absent — no conflicting verified owner

## Approved boundary

Deterministic supportability in `src/domain/criticalAssetSupportability.ts`:

- Caller-owned inputs for spare/stock, supplier disruption, maintainer, documentation, tooling, compatibility, replacement path
- States: `supported` | `at_risk` | `unsustainable` with stable reason codes and provenance tags
- Integrity/condition input accepted but never drives the supportability band (orthogonality)
- No mutation of inventory, integrity, competency, knowledge, or lifecycle authorities
- No automatic retirement or procurement
- Optional derived-only — no required GameState persistence for slice-1

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Full SPE-1322 supply graph engine | SPE-1322 | Caller-owned disruption/availability facts |
| Competency framework expansion | SPE-1059 | Caller-owned maintainer eligibility |
| Knowledge freshness authority | SPE-58 / SPE-1910 | Caller-owned documentation/tooling flags |
| Obsolescence / retirement actions | SPE-3150 remainder / SPE-1564 | Assessment only |
| Facility register presentation | SPE-3359 | Reasons exposed for consumers |

## Validation

- `npm exec vitest run -- src/test/criticalAssetSupportability.contract.test.ts` (8 passed)
- `npm exec eslint --` on touched TS files (clean)
- `npm run verify:backlog-handoff` (OK)
