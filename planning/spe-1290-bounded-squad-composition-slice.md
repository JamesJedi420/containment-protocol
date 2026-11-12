# SPE-1290 — Bounded squad composition and role-slot assignment seam

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-1290](https://linear.app/spectranoir/issue/SPE-1290/bounded-squad-composition-and-role-slot-assignment-seam) |
| **Parent** | [SPE-1025](https://linear.app/spectranoir/issue/SPE-1025) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-1290-bounded-squad-composition-and-role-slot-assignment-seam` |
| **Base main SHA** | `5f18245f` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `5f18245f`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-1290  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-3076 Done/merged (#4474); clean `main` @ `5f18245f`; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-3166 blocked by SPE-3162; SPE-3162 umbrella; SPE-2999 blocked by SPE-1384; SPE-2803 larger integration; SPE-1290 High restore seam.
3. **Winner lines** — Priority High; no blockers; bounded domain-only roster slot seam; historical commit `aa01276` absent from main; one coding slice.
4. **Duplication** — not in recentlyShipped; no `squadRoster` on main.
5. **Contradiction** — no STOP/hold conflict with SPE-1023/1024/912 boundaries.
6. **Eligibility** — exists; In Progress; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-1290.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/squadRoster.ts`: create roster, assign/remove slot, composition readback
- Typed rejection `slot_occupied` | `role_mismatch`
- Targeted Vitest coverage for success, both rejections, vacancy, ordered composition
- No UI; no patrol/doctrine/duty/readiness ownership

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Kit assignment / templates | SPE-1299 / SPE-1295 | Separate approved seams |
| Patrol / alert doctrine | SPE-1023 | Out of boundary |
| Duty/specialization model | SPE-1024 | Out of boundary |

## Validation

- `npm run test:run -- src/test/squadRoster.test.ts`
