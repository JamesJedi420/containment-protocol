# SPE-3044 — Versioned difficulty profiles and resolved run configuration

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3044](https://linear.app/spectranoir/issue/SPE-3044/versioned-difficulty-profiles-and-resolved-run-configuration) |
| **Parent** | [SPE-1734](https://linear.app/spectranoir/issue/SPE-1734/campaign-rules-and-settings-ledger) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3044-versioned-difficulty-profiles-and-resolved-run-configuration` |
| **Base main SHA** | `5209d5be` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `5209d5be`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3044  

## Approved boundary

- Pure domain `difficultyProfileResolver.ts` — Cozy / Normal / Workhorse / Custom registry, resolve snapshot, Custom bounds, authored Custom defaults, graduate-bounty campaign cap interpretation
- Consumer adapters for XP/renown/economy/injury/fatality/upkeep/wages + Custom option projectors
- Optional `CampaignLedgerState.difficultyProfile` binding; legacy absence → Cozy 1.0× (SPE-2898 stable)
- `noMarketPurchases: true` fails closed without alternate progression-resource route affirmation

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Deep week-close wires into SPE-1059 / SPE-119 / standing / recruitment producers | those owners | Adapters ship here; producers consume when scheduled |
| UI difficulty picker | setup UI | Out of domain boundary |
| SPE-2898 transition declarations for profile switches mid-campaign | SPE-2898 | Transition vocabulary already shipped; apply when UI enables changes |
