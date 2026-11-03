# SPE-3293 — Shared-universe canon release binding and campaign adoption

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3293](https://linear.app/spectranoir/issue/SPE-3293/shared-universe-canon-release-binding-and-campaign-adoption) |
| **Parent** | [SPE-1734](https://linear.app/spectranoir/issue/SPE-1734/campaign-rules-and-settings-ledger) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3293-shared-universe-canon-release-binding-and-campaign-adoption` |
| **Base main SHA** | `53a5fe97` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `53a5fe97`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3293  

## Approved boundary

- Campaign binding schema + ledger hydrate (`legacy_unbound` / `bound`)
- New-campaign bind from SPE-3300 default/eligibility
- Atomic adoption via SPE-2898 + domain precommits + receipt
- Idempotent entity/relation materialization receipts
- SCHEMA_REGISTRY + tests
- No concrete cross-domain gameplay adapters; no UI; no transport queues

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Concrete domain materialization adapters | Owning subsystems | Orchestration/receipts only here |
| SPE-3175 transport delivery | SPE-3175 | Catalog producer seam |
| Full end-to-end Dead Air → campaign fixture matrix | Later fold | Core bind/adopt/receipt covered |

## Validation

- `npx vitest run src/domain/sharedUniverseCanonReleaseBinding.test.ts`
- `npm run verify:backlog-handoff`
