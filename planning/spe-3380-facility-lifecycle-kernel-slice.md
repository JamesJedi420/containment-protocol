# SPE-3380 — Canonical facility lifecycle kernel

| Field                  | Value                                                               |
| ---------------------- | ------------------------------------------------------------------- |
| **Status**             | **Recently shipped**                                                |
| **Issue**              | [SPE-3380](https://linear.app/spectranoir/issue/SPE-3380)           |
| **Parent**             | [SPE-1564](https://linear.app/spectranoir/issue/SPE-1564) — Backlog |
| **Integration parent** | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog |
| **Branch**             | `cursor/spe-3380-facility-lifecycle-kernel`                         |
| **Base main SHA**      | `82c98ce0abcac7364349bc4066ee4e00d45fcd01`                          |

Status and backlog classification describe the merge handoff and take effect on merge. Keep Linear In Progress until review, CI, and merge are verified.

## Approved boundary

Execute the approved Phase 1–4 child boundary and the explicit-phases plan approved October 8, 2026. Extend `FacilityInstance.status`; do not allocate or replace facility/site identities. Implement the representative construction → inspection → activation → restriction → inspection → reactivation path. Keep timed upgrades and installed effects intact.

## Transition contract

Use `resolveFacilityLifecycleTransition(facility, request, campaignWeek)` for pure proposals and `applyFacilityLifecycleTransition(game, request)` through the existing facility domain exports for atomic application. The adapter changes only the target facility on success. Rejection and replay return the exact source GameState.

Requests carry `facilityId`, `expectedStatus`, sequential `transition` (starting at 1), `action`, and optional `prerequisites`. `GameState.week` owns chronology. Results expose `outcome` (`applied`, `unchanged`, `rejected`), the facility proposal, an optional receipt, and an explicit rejection reason. The adapter also returns `game`.

| Action                | Legal edge                | Causal code                    | Required verified fact                                      |
| --------------------- | ------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `begin_construction`  | available → constructing  | `construction_authorized`      | None; authored lifecycle authorization only                 |
| `submit_construction` | constructing → inspecting | `construction_verified`        | `construction_complete`, SPE-110                            |
| `activate`            | inspecting → active       | `startup_readiness_verified`   | `startup_readiness`, SPE-876; prior construction inspection |
| `restrict`            | active → locked           | `operation_restricted`         | None; authored whole-facility restriction only              |
| `submit_restart`      | locked → inspecting       | `restart_inspection_requested` | None; opens renewed inspection                              |
| `reactivate`          | inspecting → active       | `restart_readiness_verified`   | `restart_readiness`, SPE-876; prior restart inspection      |

For gated actions, supply exactly one owner-verified bundle attestation: `kind`, matching `authority`, nonempty `sourceRef`, exact `facilityId`, target `transition`, canonical `week`, and `verified: true`. Distinct kinds identify startup and restart bundles; the caller supplies the relevant verified source reference. The caller verifies the upstream owner facts; the kernel validates their identity/provenance envelope, not construction progress or readiness content. Missing upstream authority leaves the dependent transition unavailable. No production caller fabricates these attestations in this slice.

Rejections are `invalid_request`, `missing_facility`, `invalid_campaign_week`, `upgrade_in_progress`, `lifecycle_unavailable`, `stale_transition`, `stale_status`, `illegal_transition`, `missing_prerequisite`, `invalid_prerequisite`, and `inspection_provenance_required`. Checks have deterministic order. A repeat of the exact latest receipt is unchanged, even in a later campaign week; older or conflicting receipts reject. No wall-clock input or hidden randomness.

## Persistence and compatibility

Optional `FacilityInstance.lifecycleHistory` contains `version: 1` and ordered receipts with transition number, campaign week, authored action, from/to status, cause, and prerequisite references. Status remains the sole current-state authority; history is causal evidence. Each receipt is a legal edge, follows the previous destination, and has nondecreasing bounded campaign chronology. History may begin at an available facility or a legacy active/locked facility; activation itself requires inspection provenance. No legacy history is invented.

Invalid present history becomes `{ version: 1, unavailable: true }`, survives repeated save/export/load, and blocks lifecycle commands. Unproven `constructing`/`inspecting` normalize to `inactive`. Normalize history before JSON serialization so sparse packets and inherited unavailable flags cannot disappear into usable authority. Save/store/event versions remain unchanged; field-level hydration supplies additive compatibility.

SPE-2549 retains upgrade precedence: coherent timing normalizes to `upgrading`; invalid/orphaned timing and pending effects are removed. A tracked active facility retains its last active lifecycle receipt while the existing upgrade timer owns `upgrading`, then completion restores `active`. Lifecycle commands are blocked during upgrades. Upgrade completion, pending deltas, costs, and levels remain unchanged.

The existing SPE-2790/SPE-2772 biohazard workshop mapping consumes canonical status: active gives good mapped safety axes; locked/inspecting give poor axes and unsafe completion disposition. Existing receipt grading/replay owns the outcome. Unmapped siblings retain their fallback. `getFacilityEffectSummary` remains installed-effect aggregation; SPE-3382 owns broader status/capability reconciliation.

## Validation and audit

Focused upgrade/hydration/workshop regression passed **494 tests / seven files**; the final lifecycle file passed **46 tests**, including the real campaign week-close path. The complete `npm run test:run:ci -- --maxWorkers=2` suite passed **867 files / 9,465 tests**. Local `npm run test:run -- --maxWorkers=4` exited with an unexpected vmThreads worker failure before assertion results; the supported forks rerun completed successfully. Local Node is 24.18.0; hosted CI uses Node 22.

Lint, formatting of new/touched clean-baseline files, backlog-handoff, audit-index, theme-contract, and whitespace checks pass. Pre-existing whole-file formatting drift in `facility.ts` and `backlog.md` was verified against base main and preserved. TypeScript diagnostic comparison against base main found **673 diagnostics on both versions, zero added**; the existing build drift remains outside this slice.

Six iterative pre-ship passes are clean: scope/integration, edge cases, determinism/state, regression, documentation/authoring, and cleanup. Root reviewed the complete diff and the approved Linear/GitHub contracts. Advisor runtime verification was unavailable at planning and completion preflight; root owns review. Hosted CI and external feedback remain the merge gate.

## Deferred

No approved in-boundary deferrals. Remaining parent scope is outside this child: SPE-1564 damage/takeover/retrofit/relocation/abandonment/sealing/destruction and wider governance paths; SPE-110 construction clocks/remote hauling; SPE-876 readiness evaluation; SPE-792 dependencies; SPE-1481 outputs; SPE-292/SPE-731 zone/control executors; SPE-3359 register UI; SPE-3362 site conversion; SPE-3382 effect availability. No new issues, resources, telemetry, UI, or identity termination. Closing SPE-3380 does not close either parent.
