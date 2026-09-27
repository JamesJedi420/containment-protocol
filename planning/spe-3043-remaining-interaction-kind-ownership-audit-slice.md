# SPE-3043 — Audit remaining SPE-1605 historical-route replay interaction wires (ownership STOP)

| Field                        | Value                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | **Recently shipped**                                                                                                                                                               |
| **Linear**                   | [SPE-3043](https://linear.app/spectranoir/issue/SPE-3043/audit-remaining-spe-1605-historical-route-replay-interaction-wires)                                                       |
| **Parent / lineage**         | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) — remains Backlog                                                                        |
| **Prerequisite activator**   | [SPE-3033](https://linear.app/spectranoir/issue/SPE-3033/activate-one-historical-route-replay-from-an-interaction-start) — Done; do not reopen activator semantics                 |
| **Sibling calendar**         | [SPE-3024](https://linear.app/spectranoir/issue/SPE-3024/activate-historical-route-replays-from-calendarstart-condition-policy) — Done; do not reopen calendar policy              |
| **Sibling site-action wire** | [SPE-3034](https://linear.app/spectranoir/issue/SPE-3034/fire-one-historical-route-replay-interaction-start-from-an-existing) — Done; do not reopen `enter_zone` semantics        |
| **Sibling ask wire**         | [SPE-3035](https://linear.app/spectranoir/issue/SPE-3035/fire-historical-route-replay-interview-witness-start-from) — Done; do not reopen `interview_witness` semantics           |
| **Sibling search wire**      | [SPE-3040](https://linear.app/spectranoir/issue/SPE-3040/fire-historical-route-replay-search-start-from-site-exploration-search) — Done; do not reopen `search` semantics         |
| **Deferred source**          | SPE-3040 Deferred row 1 (remaining SPE-1605 kinds after `search`)                                                                                                                  |
| **Branch**                   | `cursor/spe-1605-remaining-kind-ownership-stop-7063`                                                                                                                               |
| **Base `main` SHA**          | `f05afcb539779f96042430cdb286f84207ddbb9f`                                                                                                                                         |

## Goal

Complete an ownership audit of the five remaining SPE-1605 interaction kinds after SPE-3040 (`search`). Record a durable STOP when no honest existing store/domain action matches. Do not invent taxonomy or force-map near-misses.

## Verdict

**STOP.** No honest existing store/domain action matches `make_noise`, `operate_control`, `open_access`, `remove_asset`, or `touch_sensitive_object` on `main` @ `f05afcb5`. Do not open a store-wire child that force-maps near-misses.

## Already wired (out of scope)

| Kind | Store seam | Slice |
| ---- | ---------- | ----- |
| `enter_zone` | `recordSceneVisit` | SPE-3034 |
| `interview_witness` | `askInvestigationQuestion` | SPE-3035 |
| `search` | `applySiteExplorationSearch` → `applySiteExplorationAction(..., 'search')` | SPE-3040 |

Activator + vocabulary: `src/domain/historicalRouteReplayActivation.ts`. Store call shape to reuse later: `src/app/store/gameStore.ts` `applySiteExplorationSearch` (SPE-3040).

## Ownership audit (binding)

| Kind | Near-miss | Why rejected |
| ---- | --------- | ------------ |
| `make_noise` | `breach` alert delta in `src/domain/siteOperationalExploration.ts` | SPE-3040 Kind choice: breach ≠ make noise |
| `operate_control` | `repair` / `disarm` exploration; HQ `repairStoredEquipmentInstanceCondition` | Explicitly not operate_control |
| `open_access` | `openCourierShellFront`; `probe_access` infiltration override | Front shell / weekly probe — not site open-access |
| `remove_asset` | `destroyStoredEquipmentInstance` | HQ dispose — banned force-map; future owner [SPE-1667](https://linear.app/spectranoir/issue/SPE-1667/site-native-object-removal-escalation) (Backlog; no mid-week site remove seam yet) |
| `touch_sensitive_object` | Activator contract fixture only; `applyAuthoredChoice` | No production touch seam; [SPE-71](https://linear.app/spectranoir/issue/SPE-71/preplaced-site-trigger-families-kernel) trigger surfaces still Backlog |

Exploration catalog (`search|scan|breach|listen|hide|rest|repair|disarm|interrogate|move|retreat`) has no remaining honest SPE-1605 kind after `search`.

## Rejected false mappings (do not reopen)

- UI text-filter search boxes → `search` (SPE-3040 Kind choice)
- `breach` alert → `make_noise` (SPE-3040 Kind choice)
- `repair` / `disarm` → `operate_control` (SPE-3040 Kind choice)
- `openCourierShellFront` → `open_access`
- `destroyStoredEquipmentInstance` → `remove_asset`
- Invent parallel taxonomy beyond SPE-1605 compact vocabulary

## Scope

- Per-kind ownership table with rejected false mappings (this doc).
- Retarget SPE-3040 Deferred row 1 to this child with blocked reason.
- Backlog handoff + manifest; Linear comments (mechanic + boundary).
- No `gameStore` / domain activator call for the five kinds.
- No new GameState field. No save version bump. No UI redesign.

## Boundaries

Not implemented here:

- Any store/domain wire for `make_noise`, `operate_control`, `open_access`, `remove_asset`, `touch_sensitive_object`
- New exploration action IDs, SPE-71 kernel, SPE-1667 removal layer
- SPE-3033 activator / SPE-3024 calendar / SPE-3018 advance / SPE-3020 resolve semantic change
- Reopening enter_zone / interview_witness / search wires
- Full SPE-1605 dormant/armed/spent/recurring state machine
- Anniversary / week-of-year / seasonal start conditions
- Parent SPE-1605 closure
- UI redesign

## Acceptance

- [x] Ownership audit confirms STOP for all five remaining kinds on current `main`.
- [x] Slice doc records per-kind table, rejected mappings, and resume-after-real-seam rule.
- [x] SPE-3040 Deferred row 1 retargeted to SPE-3043 with blocked reason.
- [x] Backlog + manifest updated; `npm run verify:backlog-handoff` passes.
- [x] Parent SPE-1605 remains **Backlog**.
- [x] No store/domain wire for the five kinds.

## Validation

- `npm run verify:backlog-handoff`
- Confirmatory read: `src/app/store/gameStore.ts`, `src/domain/siteOperationalExploration.ts` (no honest seam)

## Resume wire only after a real seam

Queue a SPE-3040-shaped thin store wire for **one** kind only after one of:

- [SPE-71](https://linear.app/spectranoir/issue/SPE-71/preplaced-site-trigger-families-kernel) ships a player interaction surface that is literally touch/open/loot (maps to `touch_sensitive_object` / `open_access` without stretch), or
- [SPE-1610](https://linear.app/spectranoir/issue/SPE-1610/free-investigation-versus-crisis-action-mode) adds exploration actions literally named for noise/control/access/asset/touch, or
- [SPE-1667](https://linear.app/spectranoir/issue/SPE-1667/site-native-object-removal-escalation) exposes a mid-week site-native remove action for `remove_asset`

Until then, do not queue another SPE-1605 “wire remaining kind” child that assumes an existing action.

## Deferred

| Item | Suggested owner issue | Why deferred |
| ---- | --------------------- | ------------ |
| Thin store wire for `make_noise` / `operate_control` / `open_access` / `remove_asset` / `touch_sensitive_object` | Later SPE-1605 child **after** SPE-71 / SPE-1610 / SPE-1667 ships a matching mid-week seam | Ownership STOP — no honest existing action on `main` |
| Full SPE-1605 dormant/armed/spent/recurring state machine | Later SPE-1605 child | Out of this audit boundary |
| Anniversary / week-of-year / seasonal start conditions | Later SPE-1071 / SPE-1605 child | Outside this interaction audit; calendar absolute week remains SPE-3024 |
