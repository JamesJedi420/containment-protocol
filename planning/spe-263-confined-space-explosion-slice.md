# SPE-263 — Confined-space explosion propagation

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-263](https://linear.app/spectranoir/issue/SPE-263/confined-space-explosion-propagation) |
| **Parent** | none (standalone) |
| **Branch** | `jamesdyedbq/spe-263-confined-space-explosion-propagation` |
| **Base main SHA** | `76b5ac07` |

## Delegated approval

**Date:** 2026-10-29  
**main SHA:** `76b5ac07`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-263  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-874 Done (#4485); clean main; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-3469 contradiction-only; SPE-873/877/878/2749 large or umbrella; SPE-263 High compact.
3. **Winner lines** — Priority High; no blockers; pure confined-blast packets.
4. **Duplication** — not recentlyShipped.
5. **Contradiction** — open-space rules must not apply unchanged to confined tunnels.
6. **Eligibility** — exists Backlog; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-263.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/confinedSpaceExplosion.ts`
- Ignition from volatile buildup threshold
- Confined vs open geometry changes blast shaping
- Pre-ignition warning when buildup crosses warning threshold
- Targeted Vitest; no GameState; no fluid-dynamics simulator

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full environment hazard / map damage wire | adjacent owners | Projection/eval only this slice |
| Open-space explosion catalog | separate | Explicit SPE-263 distinction |

## Validation

- `npm run test:run -- src/test/confinedSpaceExplosion.test.ts`
