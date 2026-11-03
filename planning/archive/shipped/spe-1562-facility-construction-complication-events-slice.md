# SPE-1562 — Facility construction complication events

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                               |
| **Issue**         | [SPE-1562](https://linear.app/spectranoir/issue/SPE-1562)                          |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                |
| **Branch**        | `jamesdyedbq/spe-1562-facility-construction-complication-events`                    |
| **Base main SHA** | `012b4fb358cf207435dcb79a844da9cc1c47c426`                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-1562  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `012b4fb3`)  
**Date:** 2026-10-18  
**Continuation:** Hermes full-task delegation after SPE-1173 merge (PR #4326)

### Queue state

- Manifest `primary`: SPE-1052; SPE-1173 cleared to Recently shipped after merge
- Linear In Progress: none at pick (SPE-1173 set Done first)
- Clean `main`, no open PRs; policy byte-identical to `origin/main`

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Ineligible parent umbrella |
| SPE-1173 / SPE-1263 | Done / merged |
| SPE-1564 / SPE-1896 / SPE-3150 | Open Linear children |
| SPE-1563 / SPE-1565 / SPE-3181+ / SPE-3362 / SPE-3406 | Eligible; higher SPE ids among priority-tied |
| **SPE-1562** | Eligible; no children; four ACs fit one pure complication-packet layer; lowest SPE id |

### Decision criteria

1. **Priority:** Remaining SPE-1052 children are No priority; SPE-1562 wins lowest SPE id.
2. **Dependency:** No open blockers observed.
3. **Feasibility:** Pure deterministic complication packets; no GameState/UI required.
4. **Scope:** Compact build-phase complications (delay + revelation) — not a builder minigame.
5. **Architectural readiness:** Fits beside SPE-3380 lifecycle without replacing construction clocks.
6. **Duplication:** Not in `recentlyShipped`.
7. **Contradiction review:** SPE-3043 STOP / SPE-3121 hold untouched.
8. **Prohibitions:** No new issue/child/parent; parent not selected.

### Eligibility checklist

- Exists in Linear: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no open children: true
- AC fit one slice: true
- No open blockedBy: true
- Slice doc on feature branch before feature code: true
- Not harvest/contradiction-only: true

## Approved boundary

Pure caller-owned construction complication layer in `src/domain/facilityConstructionComplicationEvents.ts`.

- Deterministic trigger evaluation before project completion
- Delay-type and revelation-type complication packets
- Bounded cost / schedule / legitimacy impact
- No GameState, week-close wire, builder minigame, or facility UI

## API

| Symbol | Behavior |
| --- | --- |
| `evaluateConstructionComplicationTrigger` | Deterministic pre-completion trigger |
| `selectConstructionComplication` | Authored complication kind + event type |
| `projectConstructionComplicationImpact` | Cost / schedule / legitimacy / revelation |
| `authoredAnnexBuildComplicationFixture` | Acceptance fixture |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live GameState / week-close wiring | future consumer | Pure layer only |
| Builder minigame / full construction sim | out of constraints | Explicitly excluded |
| Facility register UI | SPE-3359 | UI out of boundary |

## Validation

- `npm exec vitest run -- src/test/facilityConstructionComplicationEvents.contract.test.ts`
- `npm run verify:backlog-handoff`
