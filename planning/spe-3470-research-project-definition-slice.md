# SPE-3470 — Research project definition, source capacity, milestones, and solvability validation

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                           |
| **Issue**         | [SPE-3470](https://linear.app/spectranoir/issue/SPE-3470)                                      |
| **Parent**        | [SPE-3342](https://linear.app/spectranoir/issue/SPE-3342) — Backlog                             |
| **Branch**        | `jamesdyedbq/spe-3470-research-project-definition-source-capacity-milestones-and`              |
| **Base main SHA** | `2b25b239f4cf01629b0340913e9aab55c3455e67`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3470  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=c78fdc803d2d2e22b77fe78d`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3359 (Linear **Done**, PR #4423 @ `2b25b239`)
- Clean `main`, no open PRs
- Recommended next named no concrete eligible SPE-1052 leaf
- No SPE implementation slice In Progress on Linear (DA-* ignored)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 / SPE-1564 / SPE-792 / SPE-3150 | Parent umbrellas |
| SPE-3359 | Done / merged — handoff stale only |
| SPE-3439 / SPE-3441 / SPE-3451 / SPE-3452 / SPE-3385 | Open `blockedBy` |
| SPE-1058 / SPE-1896 / SPE-3181 / SPE-2794 / SPE-120 | `delegate` absent; `assignee` James Dye → legacy owner |
| SPE-3360 / SPE-3406 | Broader multi-AC programs — not one coherent coding slice |
| SPE-3394 | Soft-depends on unshipped SPE-120 region vocabulary |
| SPE-3417 | Eligible contradiction check; deferred behind this leaf |
| SPE-3343 | Open `blockedBy` SPE-2266 |
| **SPE-3470** | Childless SPE-3342 leaf; no `blockedBy`; coherent definition/validation ACs |

### Decision criteria

1. **Priority:** Research authored-definition leaf after SPE-3471 access projection shipped.
2. **Dependency:** No open Linear blockers; runtime stays SPE-3343.
3. **Feasibility:** Pure schema + static solvability; no GameState/UI.
4. **Scope:** One coding slice; static authoring only.
5. **Architectural readiness:** SPE-3471 already routes analytical capacity here.
6. **Duplication:** Not recentlyShipped.
7. **Contradiction:** SPE-3043 / SPE-3121 holds unchanged.
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

Pure deterministic research-project definition and static validation in `src/domain/researchProjectDefinition.ts`:

- Versioned project definition identity with source refs + finite analytical capacity
- Milestone/threshold records with mandatory vs optional findings and typed owner-routed outputs
- Static solvability validation (duplicate IDs, invalid refs, unreachable mandatory, hard capacity/window infeasibility, alternate-route feasibility)
- Runtime-dependent / statically-indeterminate diagnostic when feasibility depends on mutable runtime inputs
- Source capacity is project-specific analytical yield — not destruction/custody/access of the underlying source
- No GameState persistence, research queue, execution resolver, pressure scalar, or UI

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Mutable execution / yield consumption / milestone firing | SPE-3343 | Runtime owner |
| Hazardous research posture | SPE-3344 | Separate owner |
| Information-source access routes | SPE-3471 | Already shipped; consumer |
| Knowledge truth / visibility | SPE-58 | Existing owner |

## API

`src/domain/researchProjectDefinition.ts`

| Function | Behavior |
| --- | --- |
| `validateResearchProjectDefinition` | Schema + static solvability diagnostics |
| `analyzeResearchProjectSolvability` | Reachability / hard-bounds / runtime-dependent matrix |

## Validation

- Targeted: `npm exec vitest run -- src/test/researchProjectDefinition.test.ts` (17 passed)
- `npm run verify:backlog-handoff` (OK)
- ESLint on touched TS files (clean)
