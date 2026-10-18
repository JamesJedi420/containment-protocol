# SPE-1481 — Facility output thresholds

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                           |
| **Issue**         | [SPE-1481](https://linear.app/spectranoir/issue/SPE-1481)                 |
| **GitHub**        | [#1495](https://github.com/JamesJedi420/containment-protocol/issues/1495) |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog       |
| **Branch**        | `jamesdyedbq/spe-1481-facility-output-thresholds`                         |
| **Base main SHA** | `0f6045a48347b2ad3055b05bd8dbb91360e34387`                                |

## Delegated approval

**Decision:** `delegated_approve` SPE-1481  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (PR #4313 merge commit `0f6045a48347b2ad3055b05bd8dbb91360e34387`)  
**Date:** 2026-10-18  
**Continuation:** Hermes explicit autonomous ship-loop continuation

### Queue state

- Manifest `primary`: SPE-1052; `inProgress`: `[]`; recently shipped head includes SPE-1667 / SPE-2102 / SPE-3389–SPE-3380
- Backlog **In progress:** (none)
- Containment Protocol Linear project In Progress: none (after closing stale SPE-3047 Done — acceptance already on main)
- Dead Air In Progress issues ignored as out of CP handoff project
- Clean `main`, no open PRs; policy file byte-identical to `origin/main`

### Candidates compared

| Candidate                                                                                                          | Verdict                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| SPE-1052                                                                                                           | Ineligible parent umbrella                                                                                                    |
| SPE-3047                                                                                                           | Was stale In Progress; acceptance already on main (`db6382b2`); closed Done this session — not a coding pick                  |
| SPE-1012 / SPE-1015 / SPE-1020 / SPE-1021 / SPE-1060 / SPE-1263 / SPE-731 / SPE-791 / SPE-792 / SPE-907 / SPE-2103 | High priority SPE-1052 children; AC spans multi-system programs — not one coherent coding slice without further decomposition |
| SPE-1058                                                                                                           | Remainder (automation/succession/priority conflict) exceeds one slice; registry already shipped                               |
| SPE-1591 / SPE-3343                                                                                                | Large or adjacent owners; SPE-3343 is research throughput under SPE-3342, not SPE-1052 child                                  |
| SPE-3121                                                                                                           | Held for SPE-3107                                                                                                             |
| SPE-3382 C1                                                                                                        | Candidate only — no issue                                                                                                     |
| **SPE-1481**                                                                                                       | Eligible bounded productive-readiness owner; SPE-3382 F4/F5 fold; no children; AC fit one pure evaluator                      |

### Decision criteria

1. **Priority:** Unblocks installed ≠ productive after SPE-3380–3389 stack.
2. **Dependency:** Not blocked by SPE-3043 STOP or SPE-3121 hold; related owners remain Backlog, not open blockers.
3. **Feasibility:** Pure domain threshold evaluator; no UI/GameState required for AC.
4. **Scope:** Compact threshold bundles + explicit block reasons; smaller than SPE-1058 remainder / SPE-1591.
5. **Architectural readiness:** Consumers already distinguish installed vs effective; this owns output activation.
6. **Duplication:** Not in `recentlyShipped`; SPE-3387 gates post capacity, not site output bundles.
7. **Contradiction review:** No conflict with SPE-3382 owner folds; SPE-876 stays attestation envelope; SPE-3360 stays stage/resource handoff; no STOP hold applies.
8. **Prohibitions:** No new issue/child/parent; parent not selected; PR review preserved.

### Eligibility checklist

- Exists in Linear + GitHub #1495: true
- Backlog/Todo: true (Backlog)
- Not recentlyShipped: true
- Not parent umbrella / no open children: true
- AC fit one slice: true
- No open blockedBy: true
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true

## Approved boundary

Pure caller-owned `evaluateFacilityOutputThresholds` for representative facility `facility:biohazard-response-lab` (`BIOHAZARD_RESPONSE_FACILITY_ID`).

- Phases: `under_construction` | `initial_activation` | `stable_operation`
- Readiness axes: security, staffing, power, storage, communications (`met` | `unmet`)
- Distinct authored output bundles per productive phase; construction always nonproductive (`phase_nonproductive`)
- Unmet axes block with stable reasons (`insufficient_staffing`, `weak_security`, `absent_power`, `missing_storage`, `broken_comms`)
- Fail closed on malformed packets (`malformed_readiness`)
- No GameState field, week-close wire, funding grants, research gating, UI, or SPE-3383 topology expansion

## API

`src/domain/facilityOutputThresholds.ts`

| Symbol                             | Behavior                                                             |
| ---------------------------------- | -------------------------------------------------------------------- |
| `FACILITY_OUTPUT_FACILITY_ID`      | Alias of `BIOHAZARD_RESPONSE_FACILITY_ID`                            |
| `evaluateFacilityOutputThresholds` | Pure evaluate → `{ facilityId, productive, bundle, blockedReasons }` |
| `metFacilityOutputReadiness`       | All-met readiness helper                                             |

## Deferred

| Item                                         | Owner                      | Why deferred                             |
| -------------------------------------------- | -------------------------- | ---------------------------------------- |
| Live GameState / week-close wiring of grants | SPE-3360 / future consumer | This slice proves thresholds only        |
| Research throughput gating                   | SPE-3343                   | Separate existing owner                  |
| Utility power facts                          | SPE-1057                   | Separate existing owner                  |
| Startup/restart attestation content          | SPE-876                    | Envelope only; not productive thresholds |
| Facility register UI                         | SPE-3359                   | UI out of boundary                       |

## Validation

- `npm exec vitest run -- src/test/facilityOutputThresholds.contract.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
