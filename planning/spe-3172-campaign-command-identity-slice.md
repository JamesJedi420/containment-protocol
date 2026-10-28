# SPE-3172 — Campaign command identity profile and persistence

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3172](https://linear.app/spectranoir/issue/SPE-3172/campaign-command-identity-profile-and-persistence) |
| **Parent** | [SPE-1734](https://linear.app/spectranoir/issue/SPE-1734/campaign-rules-and-settings-ledger) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3172-campaign-command-identity-profile-and-persistence` |
| **Base main SHA** | `a2f5242d` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `a2f5242d`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3172  

### Queue state
- primary SPE-1052; handoff inProgress cleared after SPE-3186 merge
- SPE-3338 remains Linear In Progress as Codex tooling (not coding queue)
- clean main @ `a2f5242d`; no open PRs

### Candidates compared
SPE-3172 (winner); SPE-3044 (heavier); SPE-3439/SPE-3452 (blocked producers); SPE-3338 (tooling)

## Approved boundary

- Optional `CampaignLedgerState.commandIdentity` — anonymous / preset / custom modes
- Sanitize/hydrate fail-closed to anonymous; org profile fields stay separate
- Agency-establishment `command-identity` beat consumes canonical persona
- No actor IDs, gameplay modifiers, portraits, or cross-campaign library
- New Campaign setup UI copy remains out of slice (preset registry provides domain copy only)

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| New Campaign setup presentation surface | setup UI owner | Issue assigns preset copy/presentation outside this boundary |
| Versioned difficulty profiles | SPE-3044 | Distinct run-tuning owner |
