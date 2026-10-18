# SPE-3177 — Containment co-location compatibility and placement constraints

| Field             | Value                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                            |
| **Issue**         | [SPE-3177](https://linear.app/spectranoir/issue/SPE-3177)                  |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog        |
| **Branch**        | `jamesdyedbq/spe-3177-containment-co-location-compatibility-and-placement` |
| **Base main SHA** | `723411c4a23211e3f65ccf6e6f9ab6122c21f6f5`                                 |

## Delegated approval

**Decision:** `delegated_approve` SPE-3177  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `723411c4a23211e3f65ccf6e6f9ab6122c21f6f5`)  
**Date:** 2026-10-18  
**Continuation:** Hermes full-task delegation after SPE-2103 merge (Linear Done; handoff still listed In Progress — cleared on this pick)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-2103 cleared (Linear Done + PR #4322 @ `3ce302b2`)
- Containment Protocol Linear In Progress: none (Dead Air SPE-2977 / 2966 / 2937 / 2838 / 2832 ignored)
- Clean `main`, no open PRs; policy file byte-identical to `origin/main`

### Candidates compared

| Candidate                                                                                     | Verdict                                                                     |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| SPE-1052                                                                                      | Ineligible parent umbrella                                                  |
| SPE-2103                                                                                      | Already Done / merged — not a pick; handoff stale only                      |
| SPE-1012 / SPE-1015 / SPE-1020 / SPE-1021 / SPE-1060 / SPE-1263 / SPE-731 / SPE-791 / SPE-907 | High priority; multi-system AC — not one coding slice                       |
| SPE-292 / SPE-792                                                                             | Have open children (umbrellas)                                              |
| SPE-3415                                                                                      | SPE-792 child; blocked on SPE-3390 Backlog                                  |
| SPE-3361 / SPE-3188 / SPE-3189                                                                | Broader stacking / checkout / screening programs                            |
| SPE-3121                                                                                      | Held language for SPE-3107 reconciliation; not selected                     |
| **SPE-3177**                                                                                  | Coherent pure placement-compatibility evaluator; consumes SPE-2932; no kids |

### Decision criteria

1. **Priority:** First SPE-1052 child with a one-slice AC bar after High multi-system rejects.
2. **Dependency:** SPE-2932 shipped; no open `blockedBy`; SPE-3043 STOP / SPE-3121 hold do not apply.
3. **Feasibility:** Pure domain evaluator + SPE-2932 queries; no GameState/UI required for AC.
4. **Scope:** Same-node / zone / adjacency / separation / isolation + auditable waiver; mutation left to placement owners.
5. **Architectural readiness:** Consumes SPE-2932 topology; does not duplicate SPE-1020 / SPE-1033.
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-2102 disposition and SPE-1481 thresholds.
7. **Contradiction review:** No conflict with shipped facility stack; SPE-3043 STOP unchanged.
8. **Prohibitions:** No new issue/child/parent; parent not selected; PR review preserved.

### Eligibility checklist

- Exists in Linear: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no open children: true
- AC fit one slice: true (pure evaluator satisfies placement decision AC)
- No open blockedBy: true
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true

## Approved boundary

Pure caller-owned `evaluateContainmentCoLocationPlacement` in `src/domain/containmentCoLocationCompatibility.ts`.

- Authored constraint kinds: `prohibit_same_node`, `prohibit_same_zone`, `prohibit_direct_adjacency`, `minimum_graph_separation`, `required_isolation`
- Consumes validated SPE-2932 `FacilitySectionGraph` via `lookupSpatialNode` / `queryDirectSpatialAdjacency` (+ hop separation helper)
- Returns `permitted` / `rejected` / `conditionally_permitted` with stable reasons and constraint ids
- Explicit `waiverId` skips only the matched constraint
- Fail closed on unknown spatial refs / malformed classification
- No GameState field, week-close wire, facility UI, cross-site transfer, or anomaly-interaction engine

## API

`src/domain/containmentCoLocationCompatibility.ts`

| Symbol                                   | Behavior                                                |
| ---------------------------------------- | ------------------------------------------------------- |
| `evaluateContainmentCoLocationPlacement` | Pure placement eligibility against authored constraints |
| `querySpatialGraphSeparation`            | Undirected hop distance on SPE-2932 adjacency           |

## Deferred

| Item                                   | Owner                                                     | Why deferred                    |
| -------------------------------------- | --------------------------------------------------------- | ------------------------------- |
| Placement mutation / assignment commit | existing placement/assignment owners                      | Evaluator returns decision only |
| Cross-site transfer compatibility      | [SPE-1020](https://linear.app/spectranoir/issue/SPE-1020) | Separate existing owner         |
| Runtime anomaly pairwise effects       | [SPE-1033](https://linear.app/spectranoir/issue/SPE-1033) | Separate existing owner         |
| Zoning / lockdown policy               | [SPE-292](https://linear.app/spectranoir/issue/SPE-292)   | Consume later; not redefine     |

## Validation

- `npm exec vitest run -- src/test/containmentCoLocationCompatibility.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
