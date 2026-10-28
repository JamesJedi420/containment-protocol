# SPE-3164 — Party-card draw scoped identity and deck-state migration

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3164](https://linear.app/spectranoir/issue/SPE-3164/party-card-draw-scoped-identity-and-deck-state-migration) |
| **Parent** | [SPE-3162](https://linear.app/spectranoir/issue/SPE-3162) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3164-party-card-draw-scoped-identity-and-deck-state-migration` |
| **Base main SHA** | `51c37b2e` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `51c37b2e`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-3164  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-3163 Done/merged (#4472); resume SPE-3164; clean `main` @ `51c37b2e`; no open PRs at pick.
2. **Candidates compared** — SPE-3338 tooling IP (skip); SPE-3335 blocked by SPE-3175; SPE-3162 parent (children → ineligible); SPE-792 umbrella; SPE-3452 blocked by SPE-1084; SPE-3164 High after SPE-3163 Done.
3. **Winner lines** — Priority High; dependency SPE-3163 Done; feasibility two draw call sites + deck-local continuation; scope one coherent coding slice; architectural readiness after SPE-3162/3163.
4. **Duplication** — not in recentlyShipped; SPE-3163 deferred party-card migration here.
5. **Contradiction** — no STOP/hold conflict; SPE-3043 unrelated; SPE-3121 hold unrelated.
6. **Eligibility** — exists; In Progress (resume); not recently shipped; not umbrella; acceptance fits; SPE-3163 blocker Done; slice doc created this branch.
7. **Decision** — `delegated_approve` SPE-3164.
8. **Prohibitions** — no new issue; parent not selected as coding slice; PR review preserved.

## Approved boundary

- Persist deck-local `drawContinuation` on `PartyCardState` (SPE-3162 identity + SPE-3163 exactly-once cutover)
- Migrate store manual draw and `advanceWeek` weekly hand-limit draw off campaign `rngState`
- Preserve deck/hand/discard/queued plays exactly across cutover
- Targeted tests: manual, weekly, save/resume, exactly-once cutover, hand-limit, unrelated-call isolation
- SCHEMA_REGISTRY note; no content/balance/presentation redesign

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Remaining SPE-3162 consumer migrations | SPE-3162 children / domain owners | Parent completion rule |
| Shared-universe entity registry | SPE-3335 | Blocked by SPE-3175 |

## Validation

- `npm run test:run -- src/test/partyCardDrawContinuation.test.ts src/test/sim.partyCards.test.ts`
