# SPE-1012 — Degraded-care facility risk model

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| **Status**        | **Recently shipped** (PR #4336 @ `0bc5c278`)                       |
| **Issue**         | [SPE-1012](https://linear.app/spectranoir/issue/SPE-1012)          |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog |
| **Branch**        | `jamesdyedbq/spe-1012-degraded-care-facility-risk-model`           |
| **Base main SHA** | `848681ba`                                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-1012  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `848681ba`)  
**Date:** 2026-10-19  
**Continuation:** Hermes full-task delegation after SPE-791 merge + Dependabot #4335 merge

### Queue state

- primary SPE-1052; SPE-791 Done; open PRs cleared (#4335 merged); clean main @ `848681ba`
- Linear In Progress SPE slices: none before this pick

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Parent |
| SPE-292 / SPE-792 | Open children |
| SPE-3421 | Low Sonar refactor |
| SPE-1015 / SPE-1020 | High; higher SPE ids |
| **SPE-1012** | High; lowest eligible SPE id; pure degraded-care risk packets |

### Decision criteria

1. **Priority:** High; lowest eligible SPE among High no-child children.
2. **Dependencies:** none open.
3. **Feasibility:** pure deterministic risk/zone/agency/audit packets.
4. **Scope:** bounded ACs without full healthcare sim.
5. **Architectural readiness:** matches prior facility domain packet pattern.
6. **Duplication:** not recentlyShipped; distinct from SPE-791 resident containment.
7. **Contradiction:** no STOP hold.
8. **Prohibitions:** no new issue; parent stays Backlog.

### Eligibility checklist

- Exists, Backlog: true
- Not recentlyShipped: true
- Not parent / no open children: true
- One-slice AC: true
- No open blockers: true
- Slice doc: this file
- Not harvest-only: true

## Approved boundary

Pure `src/domain/degradedCareFacilityRisk.ts`:

- Amplified anomaly risk vs baseline; quality-claim contradiction
- Hidden/partially closed zone activation
- Resident agency (witness/channel/contraband)
- Auditable care-schedule systemic neglect
- Hospital/recovery transfer threat retention under symbolic/haunting pressure
- Uneven staff knowledge fragments
- No GameState / UI / full healthcare sim

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live facility UI wiring | SPE-3359 | Pure packets |
| Full care-schedule authoring UI | candidates | Out of slice |

## Validation

- `npm exec vitest run -- src/test/degradedCareFacilityRisk.contract.test.ts`
- `npm run verify:backlog-handoff`
