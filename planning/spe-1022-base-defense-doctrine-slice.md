# SPE-1022 — Base defense doctrine and threat-class coverage matrix

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                               |
| **Issue**         | [SPE-1022](https://linear.app/spectranoir/issue/SPE-1022)                          |
| **Parent**        | none (related to SPE-1052 facility program; Linear parent unset)                   |
| **Branch**        | `jamesdyedbq/spe-1022-base-defense-doctrine-and-threat-class-coverage-matrix`       |
| **Base main SHA** | `ed175cc254f5300c2f2adf562a5c189df249938a`                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-1022  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `ed175cc2`)  
**Date:** 2026-10-20  
**Continuation:** Hermes full-task delegation naming SPE-1022 after SPE-1023 merge (PR #4343; Linear Done). Stale handoff In Progress SPE-1021 cleared (Linear Done).

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-1021 cleared (Linear Done)
- Containment Protocol Linear In Progress: none before this pick
- Clean `main`, no open PRs; policy file matches `origin/main`
- Branch created before audit evidence

### Candidates compared

| Candidate   | Verdict                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| SPE-1052    | Ineligible parent umbrella                                              |
| SPE-1021    | Already Done / merged — not a pick; handoff stale only                  |
| SPE-1023    | Already Done / merged (PR #4343)                                        |
| **SPE-1022**| Hermes-named; childless; coherent one-slice AC; pure doctrine packets   |

### Decision criteria

1. **Hermes assignment:** explicit SPE-1022 coding slice.
2. **Dependencies:** none open; related owners (SPE-448/455/1021/1095/…) remain consumers, not redefined.
3. **Feasibility:** pure threat-coverage / ingress / ring / compound-failure packets; no GameState/UI required for AC.
4. **Scope:** threat-axis coverage reconfiguration, ingress-count risk, hardened zones, concentric rings, whole-base compound failure, layout isolation tradeoff, pre-attack prep opportunity cost.
5. **Architectural readiness:** matches facility domain packet pattern; distinct from SPE-1021 automation reset and SPE-1563 geometry vulnerability.
6. **Duplication:** not recentlyShipped.
7. **Contradiction review:** no STOP hold conflict.
8. **Prohibitions:** no new issue; no Goal/Scope/Acceptance expansion; PR review preserved.

### Eligibility checklist

- Exists, Backlog → In Progress: true
- Not recentlyShipped: true
- Not parent / no open children: true
- One-slice AC: true
- No open blockers: true
- Slice doc: this file
- Not harvest-only: true

## Approved boundary

Pure `src/domain/baseDefenseDoctrine.ts`: threat-class coverage planning from internal axes, defensive-coverage module add/remove, ingress-count attack-surface risk, concentric-ring breach severity, hardened fixed-zone effects, layout isolation vs convenience tradeoff, pre-attack preparation with opportunity cost, whole-base compound-failure pressures, security posture coverage, exterior labor mitigation, and fortification progression burdens. No GameState/UI/combat simulator. No perfect sealed bunker.

## Deferred

| Item                              | Owner                         | Why deferred                    |
| --------------------------------- | ----------------------------- | ------------------------------- |
| Live base-defense UI              | SPE-3359 / UI                 | Pure packets                    |
| Concentric site geometry sim      | SPE-448                       | Consume later; not redefine     |
| Player-led settlement defense     | SPE-455                       | Distinct playable owner         |
| Siege-mode combat                 | SPE-389                       | Combat execution stays separate |
| Facility automation reset         | SPE-1021 (shipped)            | Distinct automation owner       |
| Route / path authority            | SPE-1095 / SPE-1627           | Pathing stays with owners       |
| Anomaly classification axes       | SPE-2096                      | Align later; no import labels   |

## Validation

- `npm exec vitest run -- src/test/baseDefenseDoctrine.contract.test.ts`
- `npm run verify:backlog-handoff`
