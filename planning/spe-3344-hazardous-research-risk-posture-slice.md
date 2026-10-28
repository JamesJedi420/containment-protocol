# SPE-3344 — Hazardous research risk posture and consequence resolution

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3344](https://linear.app/spectranoir/issue/SPE-3344) |
| **Parent** | [SPE-3342](https://linear.app/spectranoir/issue/SPE-3342) — Backlog |
| **Branch** | `jamesdyedbq/spe-3344-hazardous-research-risk-posture-and-consequence-resolution` |

## Delegated approval

**Decision:** `delegated_approve` SPE-3344  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27/28  
**Continuation:** Explicit implementation request (SPE-3344 branch)

## Approved boundary

Pure hazardous research risk posture and deterministic typed consequence intents in `src/domain/hazardousResearchRiskPosture.ts`:

- Explicit bounded postures: `standard`, `accelerated`, `exceeding_limits`
- `resolveHazardousResearchRiskPosture` — capability packet + gate flags; fail-closed incident prohibition; authorization ≠ safety; observation exposure channel
- `applyHazardousResearchConsequences` — ordered owner-routed intents from SPE-3343 tick outcomes; no foreign state mutation; reliability failure does not auto-invalidate claims
- Posture selection marker serialize/parse for save/load idempotency
- Vitest coverage in `src/domain/hazardousResearchRiskPosture.test.ts`

Consumes SPE-3343 throughput execution only; does not add a second research pipeline or duplicate experiment/claim stores.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Store/week-close application of consequence intents | Future integration slice | Intents only in this slice |
| Content hazard tuning tables | Configuration | Not a runtime framework |

## Validation

- Targeted: `npx vitest run src/domain/hazardousResearchRiskPosture.test.ts`
- `npm run verify:backlog-handoff`
