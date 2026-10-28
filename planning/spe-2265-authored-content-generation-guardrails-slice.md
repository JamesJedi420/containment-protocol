# SPE-2265 — Authored-content generation guardrails (slice 1)

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-2265](https://linear.app/spectranoir/issue/SPE-2265/authored-content-generation-guardrails-slice-1) |
| **Parent** | [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-2265-authored-content-generation-guardrails-slice-1` |
| **Base main SHA** | `c3fc87b1` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `c3fc87b1`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-2265  

## Approved boundary

- Pure `authoredContentGuardrails` validator: required tokens, forbidden breaks, motif reuse, novelty budget
- Consume SPE-2263 rule tokens + exception handling; release-scoped eligibility via SPE-3300
- Reject missing lineage and explicitly contradictory combinations (deterministic diagnostics)
- SCHEMA_REGISTRY + targeted tests
- No proc-gen pipeline; no GameState; no runtime anomaly engine

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full proc-gen / content pipeline | out of slice | Explicit non-goal |
| Runtime anomaly interaction | SPE-1033 | Distinct owner |
| World-law compatibility | SPE-151 / SPE-2098 | Paired owners |

## Validation

- `npx vitest run src/domain/authoredContentGuardrails.test.ts`
