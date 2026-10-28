# SPE-3108 — Campaign-profile threat-family terminology migration

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3108](https://linear.app/spectranoir/issue/SPE-3108/campaign-profile-threat-family-terminology-migration) |
| **Parent** | [SPE-1734](https://linear.app/spectranoir/issue/SPE-1734/campaign-rules-and-settings-ledger) |
| **Branch** | `jamesdyedbq/spe-3108-campaign-profile-threat-family-terminology-migration` |
| **Base main SHA** | `76bb56c2` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `76bb56c2`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291…`)  
**Decision:** `delegated_approve` SPE-3108  

Linear comment on SPE-3108 records queue state (SPE-3367 Done @ `76bb56c2` / PR #4450), selection among SPE-3120 / SPE-2805 / SPE-3451 / SPE-3056 / SPE-3181, contradiction review, and eligibility checklist. No new issue/child/parent/relationship created. SPE-555 stays Done/closed.

## Approved boundary

- Rename campaign-era profile contract from `prevalentMonsterFamilies` / `monsterPressureFamilies` to CP-native `prevalentThreatFamilies` / `threatPressureFamilies`
- Update `src/domain/campaignEraProfiles.ts`, case-generation adapter in `src/domain/caseGeneration.ts`, and targeted tests in `src/test/sim.campaignEraProfiles.test.ts`
- Preserve deterministic semantics, ordering, values, and campaign-era behavior (terminology/schema normalization only)
- Prove durable-data compatibility unnecessary (runtime-only packets; no GameState/save/fixture dependency on old names) — do not invent a migration adapter
- Update directly affected schema documentation in `SCHEMA_REGISTRY.md`
- Do not reopen SPE-555; do not redefine threat taxonomy (SPE-623) or region-packet actor terminology (SPE-558); no repo-wide `monster` search-replace

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| Campaign-era profile runtime types no longer expose `prevalentMonsterFamilies` or `monsterPressureFamilies` as the canonical contract | `CampaignEraProfileInput` / `CampaignEraProfilePacket` / `CampaignEraOverlaySurface` use `prevalentThreatFamilies` / `threatPressureFamilies` |
| Case generation and targeted tests consume the canonical CP-native threat-family fields | `caseGeneration.ts` + `sim.campaignEraProfiles.test.ts` |
| Identical inputs produce behaviorally identical campaign-era overlays apart from field names | Existing deterministic packet/overlay equality tests; overlay asserts `threatPressureFamilies` |
| Persisted/authored compatibility is either proven unnecessary or covered by one explicit bounded adapter | Proven unnecessary — SCHEMA_REGISTRY SPE-3108 entry + repo search (no durable old-name consumers) |
| No unrelated threat taxonomy, balancing, campaign progression, or region-packet behavior changes | Diff limited to rename + docs/handoff |
| Directly affected architecture/schema docs agree with the shipped field names | `SCHEMA_REGISTRY.md` campaign-era profile threat-family contract entry |

## Compatibility finding

Repo-wide search for `prevalentMonsterFamilies` / `monsterPressureFamilies` found only:

1. `src/domain/campaignEraProfiles.ts` (canonical contract — renamed)
2. `src/domain/caseGeneration.ts` (in-memory adapter literal — renamed)
3. `src/test/sim.campaignEraProfiles.test.ts` (targeted fixtures — renamed)

No GameState field, save hydration path, OperationEvent payload, authored JSON fixture, or serialized export uses the old names. **No compat/migration adapter added.**

## Deferred

N/A — no in-boundary deferrals this slice. SPE-623 threat-role taxonomy and SPE-558 region-packet terminology remain outside this rename.
