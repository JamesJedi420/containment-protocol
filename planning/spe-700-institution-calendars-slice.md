# SPE-700 — Institution calendars and availability shifts

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-700](https://linear.app/spectranoir/issue/SPE-700/institution-calendars-and-availability-shifts) |
| **Parent** | [SPE-174](https://linear.app/spectranoir/issue/SPE-174) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-700-institution-calendars-and-availability-shifts` |
| **Base main SHA** | `15867a41` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `15867a41`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-700  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-1290 Done/merged (#4475); clean `main` @ `15867a41`; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-3166 blocked; SPE-378 large; SPE-2803 large; SPE-700 High compact.
3. **Winner lines** — Priority High; no blockers; pure calendar→availability packets; reuses SPE-1071 week identity.
4. **Duplication** — not in recentlyShipped.
5. **Contradiction** — SPE-698/SPE-1071 remain separate owners.
6. **Eligibility** — exists; In Progress; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-700.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `src/domain/institutionCalendar.ts` entries + availability shift projection
- Recurrence: once / annual week-of-year / interval
- Effects: public_access, staffing, crowding, ritual_behavior
- Targeted Vitest; no GameState field; no liturgical sandbox; no UI

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Institution doctrine/profile schema expansion | SPE-698 | Separate owner |
| Broader campaign calendar months/anniversaries | SPE-1071 | Broader umbrella |
| Live week-close institution behavior wire | SPE-174 follow-up | Projection-only this slice |

## Validation

- `npm run test:run -- src/test/institutionCalendar.test.ts`
