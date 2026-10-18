# SPE-2103 — Anomalous byproduct lifecycle registry (slice 1)

| Field             | Value                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                           |
| **Issue**         | [SPE-2103](https://linear.app/spectranoir/issue/SPE-2103)                                 |
| **GitHub**        | [#2160](https://github.com/JamesJedi420/containment-protocol/issues/2160)                 |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                       |
| **Branch**        | `jamesdyedbq/spe-2103-anomalous-byproduct-lifecycle-registry-residue-abatement`           |
| **Base main SHA** | `1f6e09e0c24e20f8022fa1b4f4ccfe74aef13ca2`                                                |

## Delegated approval

**Decision:** `delegated_approve` SPE-2103  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `1f6e09e0c24e20f8022fa1b4f4ccfe74aef13ca2`)  
**Date:** 2026-10-18  
**Continuation:** Hermes full-task delegation after SPE-1481 PR #4316 merge resume

### Queue state

- Manifest `primary`: SPE-1052; SPE-1481 merged (PR #4316 @ `1f6e09e0`) and Linear Done + merge comment posted
- `inProgress` cleared for this pick; no Containment Protocol feature In Progress (Dead Air SPE-2977 / 2966 / 2937 / 2838 / 2832 ignored)
- Clean `main`, no open PRs; policy file byte-identical to `origin/main`

### Candidates compared

| Candidate                         | Verdict                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| SPE-1052                          | Ineligible parent umbrella                                                                       |
| SPE-1263                          | High priority; multi-system permeability / impossible-access program — not one coding slice      |
| SPE-3360 / SPE-3181 / SPE-3406    | Large multi-owner production / requirement / cultivation programs                                |
| SPE-1564 / SPE-1896 / SPE-3150    | Have Linear children (umbrellas)                                                                 |
| SPE-3177                          | Coherent co-location evaluator, but lower priority than High children with a pure slice-1 bar    |
| SPE-1481                          | Just shipped — not a pick                                                                        |
| **SPE-2103**                      | High priority; explicit pure registry slice 1; AC names module/tests; no GameState/UI; no kids   |

### Decision criteria

1. **Priority:** High (p=2); first High child with a coherent one-slice bar after rejecting SPE-1263.
2. **Dependency:** Related SPE-1057 / SPE-1055 / SPE-1247 / SPE-292 remain separate owners; no open `blockedBy`.
3. **Feasibility:** Pure domain registry + lint + risk projection; no UI/GameState required for AC.
4. **Scope:** Residue → vessel → abatement → disposal + failure clock; persistence/UI deferred in issue body.
5. **Architectural readiness:** New byproduct lifecycle owner; does not duplicate SPE-1055 salvage recovery.
6. **Duplication:** Not in `recentlyShipped`; distinct from SPE-2102 disposition registry.
7. **Contradiction review:** SPE-3043 STOP / SPE-3121 hold do not apply; no conflict with shipped facility stack.
8. **Prohibitions:** No new issue/child/parent; parent not selected; PR review preserved.

### Eligibility checklist

- Exists in Linear + GitHub #2160: true
- Backlog/Todo → In Progress: true
- Not recentlyShipped: true
- Not parent umbrella / no open children: true
- AC fit one slice: true (issue body is already slice 1)
- No open blockedBy: true
- Slice doc created on feature branch before feature code: true (this file)
- Not harvest/contradiction-only: true

## Approved boundary

Pure caller-owned anomalous-byproduct lifecycle registry in `src/domain/anomalousByproductLifecycle.ts`.

- `ByproductLotId` + `ByproductLifecycleRecord` with source subject, hazard class, vessel, processing section, abatement method, storage output, disposal route, hazard buildup, failure clock (`annual` / `recurring` / `custom`), incident history refs, status, and audit trail
- `validateByproductLifecycle(records)` — disposal route missing for active lot → error; failure clock without emergency response hook → warning; hazard buildup ≥ threshold without incident ref → warning; orphan empty source → error
- `projectByproductRiskSummary(record, week)` — operator risk band + failure-clock due flag
- No GameState field, week-close wire, facility UI, franchise section names, or SPE-1055 salvage ownership

## API

`src/domain/anomalousByproductLifecycle.ts`

| Symbol                         | Behavior                                                              |
| ------------------------------ | --------------------------------------------------------------------- |
| `validateByproductLifecycle`   | Normalize + lint caller lots; byte-stable findings                    |
| `projectByproductRiskSummary`  | Risk band / failure-clock due for one accepted lot at a campaign week |
| `BYPRODUCT_HAZARD_BUILDUP_THRESHOLD` | Cap that requires an incident history ref                       |

## Deferred

| Item                                      | Owner                                                      | Why deferred                          |
| ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| Efficiency / waste ledger alignment       | [SPE-1247](https://linear.app/spectranoir/issue/SPE-1247)  | Separate existing owner               |
| Power dependency for processing plants    | [SPE-1057](https://linear.app/spectranoir/issue/SPE-1057)  | Separate existing owner               |
| Zone isolation on processing wing breach  | [SPE-292](https://linear.app/spectranoir/issue/SPE-292)    | Separate existing owner               |
| GameState persistence and maintenance UI  | none in this child                                         | Explicitly out of slice 1             |

## Validation

- `npm exec vitest run -- src/test/anomalousByproductLifecycle.test.ts`
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`
