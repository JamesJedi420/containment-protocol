# SPE-3300 — Shared-universe canon release catalog and scoped resolver

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3300](https://linear.app/spectranoir/issue/SPE-3300/shared-universe-canon-release-catalog-and-scoped-resolver) |
| **Parent** | [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085/canon-rules-continuity-and-universe-consistency) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3300-shared-universe-canon-release-catalog-and-scoped-resolver` |
| **Base main SHA** | `cc4a192e` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `cc4a192e`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3300  

**Selection notes:** After SPE-3282; catalog unlocks SPE-3293. SPE-3398 deferred (UI).

## Approved boundary

- Immutable release catalog over SPE-3282 validated packets
- Lookup, scoped member resolution, structural diff, default eligibility, withdraw/tombstone
- Fail-closed sanitize for non-campaign persistence callers
- SCHEMA_REGISTRY + colocated tests
- No GameState; no SPE-3293 binding; no SPE-3175 transport orchestration; no UI

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Campaign release binding/adoption | SPE-3293 | Catalog consumer |
| Non-campaign transport orchestration | SPE-3175 | Materialization producer seam |
| Full shared-entity registry | SPE-3335 | Scoped dependency when entity mapping required |
| Exhaustive relationship-diff fixture matrix | Candidate / later fold | Core supersession/rename covered |

## Validation

- `npx vitest run src/domain/sharedUniverseCanonReleaseCatalog.test.ts`
- `npm run verify:backlog-handoff`
