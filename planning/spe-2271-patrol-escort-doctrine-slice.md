# SPE-2271 — Patrol zones and escort-policy doctrine (slice 1)

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** / **Done** |
| **Issue** | [SPE-2271](https://linear.app/spectranoir/issue/SPE-2271/patrol-zones-and-escort-policy-doctrine-slice-1) |
| **Parent** | [SPE-1023](https://linear.app/spectranoir/issue/SPE-1023/response-team-readiness-patrol-and-alert-doctrine-layer) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-2271-patrol-zones-and-escort-policy-doctrine-slice-1` |
| **Merged** | PR [#4489](https://github.com/JamesJedi420/containment-protocol/pull/4489) @ `c82945fc` |
| **Base main SHA** | `357dcf7d` |

## Delegated approval

**Date:** 2026-10-29  
**main SHA:** `357dcf7d`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-2271  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-807 Done (#4488); clean main; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-3469 contradiction-only; SPE-73/68 large; SPE-1023 umbrella; SPE-2271 High slice-1.
3. **Winner lines** — Priority High; no children; compact patrol/escort doctrine registry.
4. **Duplication** — not recentlyShipped.
5. **Contradiction** — SPE-102 remains alert-propagation owner.
6. **Eligibility** — exists Backlog; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-2271.
8. **Prohibitions** — no new issue; parent SPE-1023 not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/patrolDoctrine.ts`
- `PatrolZoneRecord` + `EscortPolicyRecord` registry
- Doctrine failure hooks (decoy pursuit, glamoured victim, uncleared zone)
- Targeted Vitest; no GameState; slice-1 registry only

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Alert network propagation | SPE-102 | Adjacent owner |
| Remaining SPE-1023 doctrine children | SPE-1023 children | Parent stays Backlog |

## Validation

- `npm run test:run -- src/test/patrolDoctrine.test.ts`
