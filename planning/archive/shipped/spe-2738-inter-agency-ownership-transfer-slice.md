# SPE-2738 — Inter-agency ownership transfer governance

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-2738](https://linear.app/spectranoir/issue/SPE-2738) |
| **Branch** | `jamesdyedbq/spe-2738-inter-agency-ownership-transfer-governance` |
| **Base main SHA** | `22ba1174` (merged PR #4445) |

## Approved boundary

- Pure domain `src/domain/interAgencyOwnershipTransfer.ts` — request → authorize → complete/reject, provenance append, temporary anti-cycling lock keyed by asset class, internal reassignment without lock, forced/admin via same mutation path
- Vitest `src/domain/interAgencyOwnershipTransfer.test.ts` — success, lock rejection, expiration, internal vs transfer, duplicate, asset-class duration, forced admin
- SCHEMA_REGISTRY evidence-only note
- SPE-1071 authoritative integer weeks only; SPE-28 / SPE-951 / SPE-849 consumed as refs only (not reopened)
- No GameState field; no UI subsystem

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| Two asset classes, same path | Personnel + equipment `completeOwnershipTransfer` in demo fixtures |
| Success: ownership + provenance + one lock | Test "creates exactly one lock and provenance entry" |
| Lock blocks second transfer | `attemptTransferDuringLock` → `transfer_lock_active` + `lockRemainingWeeks` |
| Lock expires at expiration week | `expireLocksAtWeek` at `expiresAtWeek` |
| Reject/duplicate: stable reasons, no stray mutation | Unauthorized + duplicate tests |
| Internal reassignment: no transfer/lock | `applyInternalReassignment` test |
| Forced/admin same path | `completeForcedAdminOwnershipTransfer` |
| Deterministic tests | Full Vitest suite |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| GameState persistence / week-close wiring | Future SPE-2738+ | Pure registry + parse first per slice constraint |
| Player-facing custody UI | Parent / umbrella | Out of bounded domain slice |
