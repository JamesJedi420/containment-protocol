# SPE-1021 — Facility automation and countermeasure reset layer

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                               |
| **Issue**         | [SPE-1021](https://linear.app/spectranoir/issue/SPE-1021)                          |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                 |
| **Branch**        | `jamesdyedbq/spe-1021-facility-automation-and-countermeasure-reset-layer`           |
| **Base main SHA** | `8b75e248fbaaafea69f0ad647522cedc516dc158`                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-1021  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `8b75e248`)  
**Date:** 2026-10-20  
**Continuation:** Hermes full-task delegation after SPE-1020 merge (PR #4338; Linear Done; handoff still listed In Progress — cleared on this pick)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-1020 cleared (Linear Done + PR #4338 @ `8b75e248`)
- Containment Protocol Linear In Progress: none (Dead Air SPE-2977 / 2966 / 2937 / 2838 / 2832 ignored)
- Clean `main`, no open PRs; policy file byte-identical to `origin/main`

### Candidates compared

| Candidate         | Verdict                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| SPE-1052          | Ineligible parent umbrella                                              |
| SPE-1020          | Already Done / merged — not a pick; handoff stale only                  |
| SPE-292 / SPE-792 | Open children (umbrellas)                                               |
| SPE-1060          | High; larger multi-axis AC surface; higher SPE id                       |
| SPE-3421          | Low priority; oversized maintenance follow-up                           |
| SPE-1058          | Partial ship / remaining umbrella ACs; not a clean one-slice pick       |
| SPE-3121          | Held language for SPE-3107 reconciliation; not selected                 |
| **SPE-1021**      | High; childless; coherent one-slice AC; lowest eligible High SPE id     |

### Decision criteria

1. **Priority:** High; lowest eligible SPE-1052 child SPE id after open-child skips.
2. **Dependencies:** none open; SPE-3043 STOP / SPE-3121 hold do not apply.
3. **Feasibility:** pure automation / reset / discrimination / lure packets; no GameState/UI required for AC.
4. **Scope:** explicit state-command chains, manual-vs-automatic tradeoffs, reset burden, quiet degradation, anomaly prerequisite resistance, traffic false-positives, non-cruel lure routing.
5. **Architectural readiness:** matches facility domain packet pattern; distinct from SPE-1015 hostile actuators and SPE-1020 multi-site networking.
6. **Duplication:** not recentlyShipped; SPE-1015 weaponizes infrastructure as hostile surfaces, does not own automation reset/discrimination.
7. **Contradiction review:** no STOP hold conflict; SPE-3043 unchanged; SPE-3121 / SPE-3107 not selected.
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

Pure `src/domain/facilityAutomationReset.ts`: explicit device state-command chains, manual-vs-automatic response tradeoffs, reset/maintenance burden profiles, quiet degradation with inspection recovery, anomaly-class prerequisite resistance, traffic discrimination / false-positive outcomes, and non-cruel lure routing into capture zones. No GameState/UI/BMS/cloud simulator. No universal perfect containment cell.

## Deferred

| Item                              | Owner                 | Why deferred                         |
| --------------------------------- | --------------------- | ------------------------------------ |
| Live facility automation UI       | SPE-3359 / UI         | Pure packets                         |
| Zoning / lockdown policy wire     | SPE-292               | Consume later; not redefine          |
| Hostile actuator composition      | SPE-1015 (shipped)    | Distinct hostile-surface owner       |
| Multi-site network composition    | SPE-1020 (shipped)    | Distinct networking owner            |

## Validation

- `npm exec vitest run -- src/test/facilityAutomationReset.contract.test.ts`
- `npm run verify:backlog-handoff`
