# SPE-3163 — Legacy rngState compatibility and stochastic cutover

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3163](https://linear.app/spectranoir/issue/SPE-3163/legacy-rngstate-compatibility-and-stochastic-cutover-migration) |
| **Parent** | [SPE-3162](https://linear.app/spectranoir/issue/SPE-3162) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3163-legacy-rngstate-compatibility-and-stochastic-cutover` |
| **Base main SHA** | `336fd509` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `336fd509`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-3163  

### Decision criteria

1. **Queue state** — primary SPE-1052; inProgress cleared after SPE-2099 merge; recentlyShipped head SPE-2099; clean `main` @ `336fd509`; no open PRs at pick.
2. **Candidates compared** — SPE-3335 (blocked by SPE-3175); SPE-3162 parent (has children → ineligible); SPE-3164 (blocked by SPE-3163); SPE-792 umbrella; SPE-3452 (blocked by SPE-1084); SPE-3338 tooling In Progress (skip).
3. **Winner lines** — Priority High; dependency SPE-2898 shipped; feasibility pure domain cutover + kernel; scope one coherent coding slice; architectural readiness after transition contract.
4. **Duplication** — not in recentlyShipped; kernel not previously shipped as shared API.
5. **Contradiction** — no STOP/hold conflict; SPE-3043 unrelated; SPE-3121 hold unrelated.
6. **Eligibility** — exists; Backlog; not recently shipped; not umbrella; acceptance fits; no open blockers; slice doc created this branch.
7. **Decision** — `delegated_approve` SPE-3163.
8. **Prohibitions** — no new issue; parent not selected as coding slice; PR review preserved.

## Approved boundary

- Ship SPE-3162 kernel surface in `stochasticIdentity.ts` (parent stays open)
- SPE-3163 cutover: hydrate, exactly-once marker, grandfather in-flight, post-cutover scoped resolve
- Consume SPE-2898 transition vocabulary
- Targeted tests; SCHEMA_REGISTRY note
- No party-card store migration (SPE-3164); no full GameState rewrite

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Party-card draw migration | SPE-3164 | Blocked by this cutover |
| Remaining SPE-3162 consumer migrations | SPE-3162 children / domain owners | Parent completion rule |
| Shared-universe entity registry | SPE-3335 | Blocked by SPE-3175 |

## Validation

- `npm run test:run -- src/test/legacyRngStateCutover.test.ts`
