# SPE-2273 — Cross-system transformation registry (slice 1)

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                           |
| **Issue**         | [SPE-2273](https://linear.app/spectranoir/issue/SPE-2273)                                      |
| **Parent**        | [SPE-1090](https://linear.app/spectranoir/issue/SPE-1090) — Backlog                             |
| **Branch**        | `jamesdyedbq/spe-2273-cross-system-transformation-registry-object-refs-morphism`               |
| **Base main SHA** | `76daa9f1410aa379e23e76ecfc05ba56a253d55c`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-2273  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=b37af24cbd59f697ac7a2380`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3381 (Linear **Done**, PR #4417 merged @ `76daa9f1`); coding queue empty
- SPE coding In Progress at pick: none (open In Progress are DA-* only)
- Clean `main`, no open PRs; policy file matches `origin/main`
- Recommended next step named no concrete eligible leaf (SPE-1052 parent only)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent umbrella |
| SPE-3381 | Done / merged — handoff stale only |
| SPE-3439 | Open `blockedBy` SPE-2995 + SPE-1896 |
| SPE-3441 | Open `blockedBy` SPE-3394 |
| SPE-3451 / SPE-3452 | Open `blockedBy` |
| SPE-3385 | Open `blockedBy` SPE-2794 |
| SPE-3415 | Open `blockedBy` SPE-3390 |
| SPE-3390 | Open `blockedBy` SPE-2273 |
| SPE-3394 | Soft-depends on SPE-120 body regions (Backlog; no vocabulary on main) — architectural readiness fail |
| SPE-2794 | Parent umbrella (children SPE-3056 / SPE-3124) |
| SPE-1896 | SPE-1052 child but parent umbrella (child SPE-2771) |
| SPE-1434 | Eligible restore alternate; No priority; AC includes build-green; deferred to High-priority substrate |
| **SPE-2273** | High priority; childless; no open `blockedBy`; coherent slice-1 ACs; assignee/delegate absent at pick; unlocks SPE-3390 → SPE-3415 facility env path after SPE-3381 related folds |

### Decision criteria

1. **Priority:** High; first eligible High leaf after SPE-1052 children exhausted as blocked/parents.
2. **Dependency:** No open Linear blockers; required by SPE-3390 / SPE-3471 / SPE-3415.
3. **Feasibility:** Pure domain registry + fixture chain + focused tests; no GameState/UI.
4. **Scope:** Slice-1 schema/validation/composition only; one three-step fixture.
5. **Architectural readiness:** Greenfield; no parallel registry on main.
6. **Duplication:** Not in `recentlyShipped`; distinct from facility lifecycle/dependency kernels.
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
- Ownership: `delegate` absent; `assignee` absent at pick — no conflicting verified owner

## Approved boundary

Pure deterministic cross-system transformation registry in `src/domain/crossSystemTransformationRegistry.ts`:

- Types: `SimulationObjectRef`, `TransformationMorphism`, `CompositionTrace`
- Morphism kinds: `identity`, `compose`, `map`, `translate` (translate requires source provenance)
- `validateMorphismChain(chain)` — dangling refs, illegal compose arity, translate without provenance, circular compose without identity escape
- `composeMorphisms(left, right)` and `buildCompositionTrace(...)`
- Fixture chain: evidence record state → interpretation summary → policy review flag
- Focused tests in `src/test/crossSystemTransformationRegistry.test.ts`
- No UI, GameState persistence, authority graph, relationship emergence, or map-layer duplication

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Environmental operational-context resolver | SPE-3390 | Blocked by this slice |
| Facility env → dependency projection | SPE-3415 | Blocked by SPE-3390 |
| Information-source access projection | SPE-3471 | Blocked by this slice |
| Natural-equivalence / analogy registry | SPE-1090 / future | Explicit Deferred on issue |
| Functor layers to UI/reports | SPE-1090 / future | Explicit Deferred on issue |

## Validation

- Targeted: `npm exec vitest run -- src/test/crossSystemTransformationRegistry.test.ts` (9 passed)
- `npm run verify:backlog-handoff` (OK)
- `npm exec eslint --` on touched TS files (clean)
