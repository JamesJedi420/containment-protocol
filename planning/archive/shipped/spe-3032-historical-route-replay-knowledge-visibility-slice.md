# SPE-3032 — Project knowledge/intel into historical-route replay visibility inputs

| Field                | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**           | **Recently shipped**                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Linear**           | [SPE-3032](https://linear.app/spectranoir/issue/SPE-3032/project-knowledgeintel-into-historical-route-replay-visibility-inputs)                                                                                                                                                                                                                                                                                                                                                                |
| **Parent / lineage** | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog                                                                                                                                                                                                                                                                                                                                                                                    |
| **Presentation**     | [SPE-1080](https://linear.app/spectranoir/issue/SPE-1080/presentation-accessibility-and-simulation-explainability) / [SPE-2688](https://linear.app/spectranoir/issue/SPE-2688/shared-operational-explanation-surfaces) — named owners, not Linear parents                                                                                                                                                                                                                                      |
| **Related**          | [SPE-3026](https://linear.app/spectranoir/issue/SPE-3026/project-historical-route-replays-into-a-bounded-player-facing) / [SPE-3031](https://linear.app/spectranoir/issue/SPE-3031/surface-historical-route-replay-anchorsedges-in-one-bounded-maproute) / [SPE-3027](https://linear.app/spectranoir/issue/SPE-3027/persist-multi-site-spe-1392-historical-route-memory-graphs-on) / [SPE-1392](https://linear.app/spectranoir/issue/SPE-1392/historical-route-memory-and-nonlocal-edge-graph) |
| **Branch**           | `cursor/spe-3032-historical-route-replay-knowledge-visibility-cffc`                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Base `main` SHA**  | `4cf23f2d47978e03f52ee6253181fcb98fc6921d`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Goal

Project SPE-1392/SPE-3027 memory-graph knowledge (`unknown` | `inferred` | `verified`, optional `reconnaissanceConfidence`) into one bounded `HistoricalRouteReplayVisibility` input reused by SPE-3026 explanation and SPE-3031 map chrome.

This closes SPE-3026 and SPE-3031 Deferred rows for **Knowledge-system-driven visibility inputs**.

## Ownership audit

| Concern                                   | Existing owner reused by this slice                                      |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Replay create / advance / resolve helpers | SPE-3009 / SPE-3018 / SPE-3020 — **unchanged**; not called by this slice |
| Canonical registry sanitize               | `normalizeHistoricalRouteReplayRegistry` / SPE-3017                      |
| Multi-site memory graphs                  | SPE-3027 `historicalRouteMemoryGraphs`                                   |
| Visibility shape                          | SPE-3026 `HistoricalRouteReplayVisibility` — **unchanged interface**     |
| Text explanation / map chrome adapters    | SPE-3026 / SPE-3031 — **helper semantics unchanged**; consumers only     |
| Calendar activation                       | SPE-3024 — **not imported or invoked**                                   |
| Knowledge → visibility projector          | **This slice**                                                           |

## Scope

- Pure `historicalRouteReplayVisibilityFromKnowledge.ts`.
- Wire the **same** `visibilityFor` into both adapters from `OperationsReportPanel.tsx` only.
- Deterministic fail-closed rules (seed → expand inferred/verified only → authorize full route only on verified/high confidence → conservative on missing/empty/all-unknown).
- Targeted Vitest + slice doc + backlog handoff; retarget SPE-3026 / SPE-3031 Deferred knowledge rows here.

## Boundaries

Not implemented here:

- SPE-3009 / SPE-3017 / SPE-3018 / SPE-3020 / SPE-3024 / SPE-3026 / SPE-3031 helper semantic changes
- SPE-22 `KnowledgeStateMap` bridge; `src/domain/knowledge.ts` / `src/domain/intel.ts` fusion/decay
- Using map-chrome `knowledgeState` as the gate (display metadata only)
- Automatic activation, SPE-950 possession, SPE-3007 route_link invent
- SPE-1052 catalog reopen; full SPE-1104 / SPE-1244 cartography
- Coordinates or causal overclaim
- Parent SPE-1606 / SPE-1080 closure

## Acceptance

- [x] Known knowledge fixtures expand authorized anchors; low knowledge does not leak full route.
- [x] Empty/unknown inputs match conservative fallback.
- [x] Same visibility drives explanation + map chrome.
- [x] No SPE-3024 activation import; frozen inputs unmodified.
- [x] Slice doc, backlog handoff/manifest updated; SPE-3026/SPE-3031 Deferred knowledge rows retargeted.
- [x] Parent SPE-1606 and SPE-1080 remain **Backlog**.

## Validation

- `npm run test:run -- src/test/historicalRouteReplayVisibilityFromKnowledge.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                  | Suggested owner issue                                                                                 | Why deferred                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Interaction-triggered mid-week starts | [SPE-3033](https://linear.app/spectranoir/issue/SPE-3033/activate-one-historical-route-replay-from-an-interaction-start) — `planning/spe-3033-historical-route-replay-interaction-start-slice.md` | Sibling of SPE-3024 calendar path; owns one SPE-1605 interaction → approaching create. |
| SPE-22 KnowledgeStateMap bridge       | Later SPE-22 / SPE-58 child                                                                           | Out of bound — memory-graph knowledge only; no domain knowledge.ts. |
| Full cartographic map framework       | SPE-1104 / SPE-1244                                                                                   | Out of bound; this is one visibility input only.                    |
