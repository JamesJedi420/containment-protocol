# SPE-2079 — Proximity-risk class orthogonal to information clearance

| Field             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                                |
| **Issue**         | [SPE-2079](https://linear.app/spectranoir/issue/SPE-2079)                                      |
| **Parent**        | [SPE-292](https://linear.app/spectranoir/issue/SPE-292) — Backlog (facility zoning umbrella)   |
| **Grandparent**   | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                            |
| **Branch**        | `jamesdyedbq/spe-2079-proximity-risk-class-orthogonal-to-information-clearance`                |
| **Base main SHA** | `ff58fb5541ecf2bf9c6bfab1c6c6165c1a568a7e`                                                     |

## Delegated approval

**Decision:** `delegated_approve` SPE-2079  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `ff58fb55`)  
**Date:** 2026-10-21  
**Continuation:** Hermes full-task delegation / next-slice selection after PR #4346 merged (SPE-1013 attribution correction)

### Queue state

- Manifest `primary`: SPE-1052; `inProgress`: []; recentlyShipped head SPE-3421 / SPE-1022 / …
- Clean `main` @ `ff58fb55` after merging open PR #4346; no open PRs at pick
- SPE coding In Progress: none (open Linear In Progress are DA-* content only: SPE-2977 / 2966 / 2937 / 2838 / 2832)
- SPE-1013 returned to Backlog after domain-only delivery + attribution correction (not a resume coding slice)
- Recommended next step named no concrete eligible leaf (SPE-1052 parent only)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Parent umbrella — ineligible |
| SPE-1060 | High SPE-1052 child; **not one-slice** — multi-system room-quality/faction/cover sprawl |
| SPE-1058 | Remainder beyond shipped registry kernel (automation/succession/priority) — not one-slice |
| SPE-3181 | Eligible leaf but **not one-slice ready** — GameState/save-load + SPE-3041 + SPE-1135 span |
| SPE-3188 / SPE-3189 / SPE-3360 / SPE-3406 | Larger multi-authority lifecycle contracts |
| SPE-3359 | Facility register UI — broader UI surface |
| SPE-3415 | Soft-depends on unfinished SPE-3390 |
| SPE-292 | Parent umbrella with open child SPE-2079 — not the coding slice |
| **SPE-2079** | Unblocked SPE-292 leaf; three observable ACs; pure proximity vs clearance gate fits one domain packet |

### Decision criteria

1. **Priority:** No Linear priority; selected as highest-value one-slice-ready leaf after SPE-1052 direct children failed one-slice AC fit.
2. **Dependency:** No open `blockedBy`; SPE-292 remains the zoning umbrella (deferred full zone packet schema).
3. **Feasibility:** Pure caller-owned proximity class + information-clearance decision → zone-entry gate; no GameState.
4. **Scope:** Proximity-risk classes, orthogonal zone gate, strategic-essential contact breach flag, readable denial reasons.
5. **Architectural readiness:** Aligns with SPE-731 access bands / SPE-1046 clearance substrate patterns without rewriting them.
6. **Duplication check:** Not in `recentlyShipped`; distinct from information clearance and layered facility control.
7. **Contradiction review:** No SPE-3043 STOP implication; SPE-3121 hold unrelated; SPE-3107 Done.
8. **Prohibitions:** No new issue/child/parent; SPE-1052 / SPE-292 not selected as coding slice; PR review preserved.

### Eligibility checklist

- Exists in Linear: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no open children: true
- AC fit one slice: true
- No open blockedBy: true
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true

## Approved boundary

Pure caller-owned proximity-risk gate in `src/domain/proximityRiskClearance.ts`:

- Authored proximity-risk classes (operationally blind → strategic-essential-no-entry band)
- Zone entry evaluated from proximity class **independently** of caller-owned information-clearance outcome
- Strategic-essential staff cannot enter direct anomaly-contact zones unless an explicit policy-breach flag is set
- Readable denial reason codes; fail-closed malformed input
- No GameState, week-close, facility zone packet schema (SPE-292), or emergency routing (SPE-36)

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Full facility zone packet schema | SPE-292 | Parent umbrella; out of this leaf |
| Emergency routing graph | SPE-36 child | Issue deferred row |
| Live UI / register wiring | SPE-3359 / UI owners | Pure packets only |

## Validation

- `npm exec vitest run -- src/test/proximityRiskClearance.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
