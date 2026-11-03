# SPE-1015 — Hostile facility-actuator system

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| **Status**        | **Recently shipped**                                               |
| **Issue**         | [SPE-1015](https://linear.app/spectranoir/issue/SPE-1015)          |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog |
| **Branch**        | `jamesdyedbq/spe-1015-hostile-facility-actuator-system`            |
| **Base main SHA** | `0bc5c278`                                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-1015  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `0bc5c278`)  
**Date:** 2026-10-19  
**Continuation:** Hermes full-task delegation after SPE-1012 merge (PR #4336)

### Queue state

- primary SPE-1052; SPE-1012 Done; clean main; no open PRs

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Parent |
| SPE-292 / SPE-792 | Open children |
| SPE-1020 / SPE-1021 | High; higher SPE ids |
| **SPE-1015** | High; lowest eligible SPE id after SPE-1012 |

### Decision criteria

1. **Priority:** High; next lowest eligible SPE id.
2. **Dependencies:** none open.
3. **Feasibility:** pure actuator/rescue/geometry packets.
4. **Scope:** AC-aligned without full BMS.
5. **Architectural readiness:** matches facility domain packet pattern.
6. **Duplication:** not recentlyShipped; distinct from SPE-1012 care risk.
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

Pure `src/domain/hostileFacilityActuator.ts`: infrastructure weaponization, contested rescue windows, utility-control rescue effects, geometry routing hazards, multi-family rescue choice. No GameState/UI/BMS.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live facility defense UI | SPE-3359 / UI | Pure packets |

## Validation

- `npm exec vitest run -- src/test/hostileFacilityActuator.contract.test.ts`
- `npm run verify:backlog-handoff`
