# SPE-2142 — Ability-use biological cost registry (slice 1)

| Field             | Value                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress**                                                                                                               |
| **Issue**         | [SPE-2142](https://linear.app/spectranoir/issue/SPE-2142/ability-use-biological-cost-registry-health-debt-from-anomalous-use) |
| **Parent**        | [SPE-1033](https://linear.app/spectranoir/issue/SPE-1033/anomaly-interaction-and-effect-system) (stays open)                  |
| **Branch**        | `jamesdyedbq/spe-2142-ability-use-biological-cost-registry`                                                                   |
| **Base main SHA** | `8b065a037bda91a9bbd87939559e2817daef0ee6`                                                                                    |

## Selection (Cursor / clean-main)

**Date:** 2026-11-10  
**main SHA:** `8b065a037bda91a9bbd87939559e2817daef0ee6`  
**Decision:** resume In Progress High child already claimed 2026-11-09

**Queue state:** no open PRs; local tip matches `origin/main`; curated handoff still listed SPE-1064 / SPE-3338 while SPE-2142 held the live coding claim.

**Skipped:** SPE-1064 (umbrella-scale), SPE-3338 (tooling projection), SPE-3437 (evidence already on main), SPE-1052 children (prefer finishing claimed High registry), stale DA In Progress.

## Approved boundary

- `src/domain/abilityUseBiologicalCostRegistry.ts`
- `src/test/abilityUseBiologicalCostRegistry.test.ts`
- This slice doc

Cumulative biological/health-debt record from anomalous ability use only. Consent, monitoring, readiness, treatment, and welfare remain **references** to existing owners — not duplicated subsystems.

## Out of scope

- GameState persistence / migrations
- Full medical workflow, clearance pipeline, or ability-execution system
- Parallel responder-exertion or welfare-debt authorities (SPE-1107 / SPE-1888 remain owners)
- UI

## Acceptance

- [x] Valid record with bounded use count, ≥1 unique organ-stress ref, legal consent + monitoring passes
- [x] Missing consent/monitoring rejected when risk exceeds review threshold
- [x] Empty/duplicate organ-stress refs and invalid risk/severity combinations rejected
- [x] Immediate activation cost distinguishable from accumulated biological health debt
- [x] Downstream consumers can inspect cumulative risk, affected systems, consent, monitoring without reconstructing
- [x] Targeted tests: validation, repeated-use accumulation, threshold review, invalid consent/monitoring, stable projection

## Validation

- `npx vitest run src/test/abilityUseBiologicalCostRegistry.test.ts`
- `npm run lint`
- `npm run format:check`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                        | Owner                   | Why                      |
| ------------------------------------------- | ----------------------- | ------------------------ |
| Persist biological-cost ledger on GameState | SPE-1033 / later child  | Slice 1 is registry-only |
| Ability-execution wiring                    | SPE-1033                | Downstream consumer      |
| Medical stabilization / welfare fulfillment | SPE-68 / welfare owners | Reference only here      |
