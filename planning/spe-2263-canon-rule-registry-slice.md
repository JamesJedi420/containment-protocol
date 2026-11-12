# SPE-2263 — Canon rule registry (supernatural consistency tokens, slice 1)

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-2263](https://linear.app/spectranoir/issue/SPE-2263/canon-rule-registry-supernatural-consistency-tokens-slice-1) |
| **Parent** | [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-2263-canon-rule-registry-supernatural-consistency-tokens-slice-1` |
| **Base main SHA** | `42a84baa` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `42a84baa`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-2263  

## Approved boundary

- Pure `canonRuleRegistry` with lookup, exceptions, supersession
- Release-scoped eligibility via SPE-3300 for shared-universe-derived tokens
- SCHEMA_REGISTRY + tests
- No GameState; no world-law engine (SPE-151 / SPE-2098)

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| World-law compatibility enforcement | SPE-151 / SPE-2098 | Paired owners |
| Authored-content guardrails | SPE-2265 | Adjacent consumer |

## Validation

- `npx vitest run src/domain/canonRuleRegistry.test.ts`
