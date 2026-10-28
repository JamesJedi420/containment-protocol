# SPE-3282 — Cross-property canon handoff contract and promotion validation

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3282](https://linear.app/spectranoir/issue/SPE-3282/cross-property-canon-handoff-contract-and-promotion-validation) |
| **Parent** | [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085/canon-rules-continuity-and-universe-consistency) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3282-cross-property-canon-handoff-contract-and-promotion` |
| **Base main SHA** | `a5b445ab` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `a5b445ab`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3282  

**Selection notes:** After SPE-3459 merge, SPE-3398 deferred (UI editor). SPE-3439 blocked by SPE-2995. SPE-3282 is the next eligible SPE-1085 child unlocking SPE-3293; domain-pure packet/validator matches recent ship pattern.

## Approved boundary

- Compact structured handoff packet + promotion dispositions
- Deterministic validation with stable diagnostics (source item, field/path, reason)
- Established vs unresolved / negative-space / disputed / non-promotable distinction
- Supersession/rename preserving prior promoted records + shared entity identity
- Release membership construction inputs (not persistent catalog)
- Consumer seams: SPE-3175, SPE-2099/SPE-1032, SPE-2264, SPE-2263, SPE-3139
- SCHEMA_REGISTRY note; colocated tests; no GameState

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Dead Air lifecycle packet producer | SPE-2823 | Integration after contract |
| Non-campaign transport orchestration | SPE-3175 | Seam only here |
| Campaign release binding/adoption | SPE-3293 | Blocked on this contract |
| Persistent shared-universe release catalog | SPE-1085 child (separate) | Explicitly out of this boundary |
| Full relation-family fixture matrix | Candidate / later fold | Core kinds + negative causality covered; exhaustive matrix not required for completion rule |
| Scenario editor UI | SPE-3398 | Separate deferred UI child |

## Validation

- `npx vitest run src/domain/crossPropertyCanonHandoff.test.ts`
- `npm run lint` (touched files)
