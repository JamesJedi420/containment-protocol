# SPE-956 — Propagation graph wire-up (slice 1)

One-page implementation plan. Linear: [SPE-2619](https://linear.app/spectranoir/issue/SPE-2619) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Harvest #965 family disposition; carved out from SPE-947 since SPE-2111 slice 1 (`planning/visual-trigger-hazard-registry-slice-1.md` § Out). Does not reopen [SPE-947](https://linear.app/spectranoir/issue/SPE-947) (**Done**).

| Field               | Value                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2619 — Propagation graph wire-up (slice 1)](https://linear.app/spectranoir/issue/SPE-2619)            |
| **Status**          | **In Progress**                                                                                            |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / harvest #965 anchor; stays **Backlog** |
| **Branch**          | `spe-956-propagation-graph-wire-up-slice-1`                                                                |
| **Base `main` SHA** | `8f713c51`                                                                                                 |

## Goal

Ship the smallest deterministic **propagation graph compose** that wires authored spread nodes/edges into existing SPE-947 evaluator + SPE-2111 registry surfaces — without reopening SPE-947, rewriting SPE-2568–2574 / SPE-2617 contracts, or inventing a full internet simulator.

## Prerequisite (on `main` @ `8f713c51`)

| Shipped                         | Anchor                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Domain evaluators               | SPE-2568–2574 pure evaluators                                                                   |
| Wire-up chain                   | SPE-2576–2617 persistence / week-close / mirror / media-economy                                 |
| Registry linkage                | [SPE-2602](https://linear.app/spectranoir/issue/SPE-2602) — `spe947VisualTriggerHazardLinkage`  |
| Pursuit vector compose          | [SPE-2604](https://linear.app/spectranoir/issue/SPE-2604) — `spe947PursuitVector` pattern       |
| Visual-trigger registry         | SPE-2111 / SPE-2336 — `visualTriggerHazardRecords`, `projectExposureChainRisk`                  |

## Graph contract (slice 1)

- **Authored graph only** — in-memory nodes/edges passed to compose; no GameState persistence this slice.
- **Node kinds** — `platform` (SPE-2568 reach) and `content_artifact` (SPE-2571 exposure).
- **Edges** — directed spread links with optional `spreadFactor` (0–1 attenuation; default 1).
- **Traversal** — deterministic BFS from `seedNodeId`; edges sorted by id; cycle-safe via visited set.
- **Registry boost** — when SPE-2602 binding resolves for a node entity, `projectExposureChainRisk` contributes `broadcastRiskScore` (read-only; no dual truth).
- **No evaluator mutation** — compose calls existing pure evaluators; contracts unchanged.

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| `src/domain/spe956PropagationGraph.ts` pure compose                  | GameState persistence / sanitize/hydrate |
| EXAMPLE authored graph fixture                                     | Week-close / `advanceWeek` wire            |
| Focused Vitest                                                     | SPE-947 parent / evaluator contract edits  |
| Slice doc + backlog handoff                                        | SPE-956 parent AC (advisory/hotline)       |
| Linear child + deferred table note on SPE-956                      | Full internet simulator                    |

## Acceptance

- [x] Empty/missing graph → empty compose result without throw
- [x] EXAMPLE path artifact → platform composes reach + exposure with stable ordering
- [x] Edge `spreadFactor` attenuates downstream aggregate deterministically
- [x] Linked registry record contributes broadcast risk when binding resolves
- [x] Unresolved/missing node entity → encoded in reasonCodes without throw
- [x] SPE-2568–2574 / SPE-2617 contracts unchanged
- [ ] `npm run lint` + targeted tests green (pre-merge)

## Deferred

| Item                              | Suggested owner | Why deferred              |
| --------------------------------- | --------------- | ------------------------- |
| GameState graph persistence       | SPE-956 slice 2 | Out of pure-compose slice |
| Week-close graph tick             | SPE-956 slice 3 | Week-close boundary       |
| Store / UI / mirror surfacing     | SPE-956 sibling | After persistence         |
| SPE-956 parent AC (advisory/hotline) | SPE-956 siblings | Separate umbrella scope |

## Validation

- `npm.cmd run test:run -- src/test/spe956PropagationGraph.test.ts`
- `npm.cmd run lint`

## See also

- `planning/visual-trigger-hazard-registry-slice-1.md` § Out
- `planning/spe-947-parent-umbrella-reconciliation-slice-2.md`
- `planning/backlog.md`
