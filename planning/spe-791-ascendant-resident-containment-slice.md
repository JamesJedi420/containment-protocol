# SPE-791 — Ascendant-resident containment facility

| Field             | Value                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **Status**        | **Recently shipped** (PR #4334 @ `323d8c2f`)                             |
| **Issue**         | [SPE-791](https://linear.app/spectranoir/issue/SPE-791)                  |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog      |
| **Branch**        | `jamesdyedbq/spe-791-ascendant-resident-containment-facility`            |
| **Base main SHA** | `cb24e87f`                                                               |

## Delegated approval

**Decision:** `delegated_approve` SPE-791  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `cb24e87f`)  
**Date:** 2026-10-19  
**Continuation:** Hermes full-task delegation after SPE-731 merge (PR #4333)

### Queue state

- primary SPE-1052; SPE-731 Done; recentlyShipped head SPE-731 / SPE-3362 / …
- clean main @ `cb24e87f`; open PRs: none

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Parent |
| SPE-292 | Open child SPE-2079 |
| SPE-3421 | Low Sonar refactor |
| SPE-1020 / SPE-1012 / SPE-1015 | High; higher SPE ids |
| **SPE-791** | High; lowest eligible SPE id; no open children; ACs fit pure resident packets |

### Decision criteria

1. **Priority:** High (2); lowest SPE id among High children with no open children.
2. **Dependencies:** no open blockers.
3. **Feasibility:** pure deterministic resident packets; no GameState.
4. **Scope:** compact resident-state / access / breach / roster surfaces inside Goal/Scope/AC.
5. **Architectural readiness:** aligns with prior facility pure-domain packets.
6. **Duplication:** not in recentlyShipped; distinct from SPE-731 control surfaces and SPE-1263 permeability.
7. **Contradiction:** no STOP hold; SPE-3043 not implicated.
8. **Prohibitions:** no new issue; parent stays Backlog; PR review preserved.

### Eligibility checklist

- Exists, Backlog: true
- Not recentlyShipped: true
- Not parent / no open children: true
- One-slice AC: true
- No open blockers: true
- Slice doc: this file
- Not harvest-only: true

## Approved boundary

Pure `src/domain/ascendantResidentContainment.ts`:

- Multi-resident roster with divergent manifestation/escalation paths
- Separated containment / care / cooperation / movement; derived posture
- Supervised zone access with escort rules
- Breach/escape linked to external case (not local-only)
- Strategic pressure for low physical-risk beneficial residents
- No GameState, psychiatry sim, or facility UI

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live facility UI / register | SPE-3359 | Pure packets |
| Full care schedule / enrichment authoring | SPE-791 remainder / candidates | Compact packets only this slice |

## Validation

- `npm exec vitest run -- src/test/ascendantResidentContainment.contract.test.ts`
- `npm run verify:backlog-handoff`
