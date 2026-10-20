# SPE-1020 — Multi-site facility network and transfer compatibility

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                    |
| **Issue**         | [SPE-1020](https://linear.app/spectranoir/issue/SPE-1020)                          |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                 |
| **Branch**        | `jamesdyedbq/spe-1020-multi-site-facility-network-and-transfer-compatibility`       |
| **Base main SHA** | `00bf4320281653329d31cb3237abf0a071a19406`                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-1020  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `00bf4320`)  
**Date:** 2026-10-19  
**Continuation:** Hermes full-task delegation after SPE-1015 merge (PR #4337; Linear Done; handoff still listed In Progress — cleared on this pick)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-1015 cleared (Linear Done + PR #4337 @ `00bf4320`)
- Containment Protocol Linear In Progress: none (Dead Air SPE-2977 / 2966 / 2937 / 2838 / 2832 ignored)
- Clean `main`, no open PRs; policy file byte-identical to `origin/main`

### Candidates compared

| Candidate        | Verdict                                                          |
| ---------------- | ---------------------------------------------------------------- |
| SPE-1052         | Ineligible parent umbrella                                       |
| SPE-1015         | Already Done / merged — not a pick; handoff stale only           |
| SPE-292 / SPE-792| Open children (umbrellas)                                        |
| SPE-1021         | High; higher SPE id than SPE-1020                                |
| SPE-1060         | High; large multi-axis AC surface                                |
| SPE-3421         | Low priority; oversized maintenance follow-up                    |
| SPE-3121         | Held language for SPE-3107 reconciliation; not selected          |
| **SPE-1020**     | High; childless; coherent one-slice AC; Hermes preferred         |

### Decision criteria

1. **Priority:** High; lowest eligible SPE-1052 child SPE id after open-child skips.
2. **Dependencies:** none open; SPE-3043 STOP / SPE-3121 hold do not apply.
3. **Feasibility:** pure site-mode / transfer / desync packets; no GameState/UI required for AC.
4. **Scope:** isolated vs networked modes, cross-site transfer compatibility, partial shared-service desync.
5. **Architectural readiness:** matches facility domain packet pattern; distinct from SPE-3177 co-location and ordinary travel logistics.
6. **Duplication:** not recentlyShipped; SPE-1015 actuators and SPE-1012 care risk do not cover multi-site networking.
7. **Contradiction review:** no STOP hold conflict; SPE-3043 unchanged.
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

Pure `src/domain/multiSiteFacilityNetwork.ts`: site-mode choice (isolated vs networked) with distinct risk/benefit packets, cross-site transfer compatibility that can fail or destabilize on schema/service mismatch, and local site operation under stale/missing/degraded shared services. No GameState/UI/cloud-infra simulator.

## Deferred

| Item                         | Owner              | Why deferred                          |
| ---------------------------- | ------------------ | ------------------------------------- |
| Live multi-site facility UI  | SPE-3359 / UI      | Pure packets                          |
| Full logistics transit sim   | logistics owners   | Transfer outcome packets only         |
| Zoning / lockdown policy     | SPE-292            | Consume later; not redefine           |

## Validation

- `npm exec vitest run -- src/test/multiSiteFacilityNetwork.contract.test.ts`
- `npm run verify:backlog-handoff`
