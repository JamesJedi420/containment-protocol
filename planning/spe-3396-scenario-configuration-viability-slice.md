# SPE-3396 — Scenario configuration viability contradiction check

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3396](https://linear.app/spectranoir/issue/SPE-3396/contradiction-check-scenario-configuration-viability-and-override) |
| **Parent** | [SPE-1734](https://linear.app/spectranoir/issue/SPE-1734) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3396-contradiction-check-scenario-configuration-viability-and` |
| **Base main SHA** | `09dbd2f0` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `09dbd2f0`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3396  

## Approved boundary

- Frozen decision contract `scenarioConfigurationViabilityContradiction.ts` + tests
- Architecture record `architecture/scenario-configuration-viability-decision.md`
- Disposition: fold into SPE-3397 + existing owners
- No SPE-3397 implementation, GameState mutation, or new Linear issues

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Versioned scenario-definition resolver | SPE-3397 | Encodes this contract |
| Mid-campaign config transitions | SPE-2898 | Transition vocabulary already shipped |
