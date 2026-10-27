# SPE-3471 — Information-source access projection and handoff contract

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-3471](https://linear.app/spectranoir/issue/SPE-3471)                                      |
| **Parent**        | [SPE-1090](https://linear.app/spectranoir/issue/SPE-1090) — Backlog                             |
| **Branch**        | `jamesdyedbq/spe-3471-information-source-access-projection-and-handoff-contract`               |
| **Base main SHA** | `ba8e0e983d8e187a32bd6b1715692e0dd8cc34c1`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-3471  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=4b56d625e53d7cb65bcd898b`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3415 (Linear **Done**, PR #4421 @ `ba8e0e98`)
- Clean `main`, no open PRs
- Recommended next named no concrete eligible SPE-1052 leaf
- No SPE implementation slice In Progress on Linear (DA-* issues ignored)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 / SPE-792 | Parent umbrellas |
| SPE-3415 | Done / merged — handoff stale only |
| SPE-3439 / SPE-3441 / SPE-3451 / SPE-3452 / SPE-3385 | Open `blockedBy` |
| **SPE-3471** | Childless; `blockedBy` SPE-2273 **Done**; coherent access-projection ACs; prior SPE-3390/3415 handoff deferred this next |

### Decision criteria

1. **Priority:** Unlocks SPE-1090 information-source handoff after SPE-2273 / SPE-3390 / SPE-3415 path.
2. **Dependency:** SPE-2273 Done clears only Linear `blockedBy`.
3. **Feasibility:** Pure caller-owned producer snapshot → typed handoff; no GameState.
4. **Scope:** One coding slice; no producer engines, SPE-3470 capacity, or UI.
5. **Architectural readiness:** SPE-2273 primitives available; SPE-58/1910 consumers stay consumers.
6. **Duplication:** Not recentlyShipped; distinct from SPE-3390 env composition.
7. **Contradiction:** SPE-3043 / SPE-3121 holds unchanged.
8. **Prohibitions:** No new issue; umbrella not selected; PR review preserved.

### Eligibility checklist

- Exists / Backlog → In Progress: true
- Not recentlyShipped: true
- Not parent / no children: true
- AC fit one slice: true
- No open blockedBy: true (SPE-2273 Done)
- Slice doc before feature code: true
- Ownership: `delegate` absent; `assignee` absent — description prose not ownership

## Approved boundary

Pure deterministic projector in `src/domain/informationSourceAccessProjection.ts`:

- Caller-owned producer access snapshots (routes, availability, completeness, CM detect/mitigate, constraint refs)
- Route-specific projection: one revoked route does not destroy source or other routes
- Orthogonal availability vs retrieval completeness vs confidence/provenance quality
- Access breadth/depth fields distinct from SPE-3470 analytical capacity (no capacity fields here)
- SPE-2273 composition/translation trace on handoffs
- Player-facing reason redaction for hidden routes/CM/monitoring
- No GameState persistence / universal access engine / producer ownership

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Research analytical source capacity | SPE-3470 | Separate owner |
| Research throughput execution | SPE-3343 | Consumer only |
| Knowledge-state / visibility | SPE-58 | Consumer policy |
| Investigation route topology | SPE-813 | Existing owner |

## API

`src/domain/informationSourceAccessProjection.ts`

| Function | Behavior |
| --- | --- |
| `projectInformationSourceAccess` | Map caller-owned producer snapshot → typed handoff + SPE-2273 trace |
| `reprojectInformationSourceAccess` | Alias for recomposition after producer mutation (no cache/ledger) |

Semantics documented in-module: producer vs projection vs consumer; availability vs completeness vs confidence; access breadth/depth ≠ SPE-3470 capacity; route revoke ≠ source destroy; CM detect ≠ mitigate; access pressure refs ≠ research progress.

## Validation

- Targeted: `npm exec vitest run -- src/test/informationSourceAccessProjection.test.ts` (11 passed)
- `npm run verify:backlog-handoff`
- ESLint on touched TS files
