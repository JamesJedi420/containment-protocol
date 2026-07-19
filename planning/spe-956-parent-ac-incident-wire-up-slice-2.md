# SPE-956 — Parent AC incident wire-up — async + survivor + memory lanes (slice 2)

One-page implementation plan. Linear: [SPE-2640](https://linear.app/spectranoir/issue/SPE-2640) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped advisory + hotline path ([SPE-2639](https://linear.app/spectranoir/issue/SPE-2639), PR #3188). Parent stays **Backlog**.

| Field               | Value                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2640 — Parent AC incident wire-up — async + survivor + memory lanes (slice 2)](https://linear.app/spectranoir/issue/SPE-2640)        |
| **Status**          | **In progress**                                                                                                                           |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog**          |
| **Branch**          | `spe-956-parent-ac-incident-wire-up-slice-2`                                                                                              |
| **Base `main` SHA** | `73ddb4fb`                                                                                                                                |

## Goal

Extend `applySpe956ParticipatoryChannelsToIncident` so async discussion, survivor informal registry, and collective memory lanes materially apply via SPE-2638 `evaluate*FromGameState` helpers for the authored riverside incident — without evaluator rewrites, mirror UI, week-close, or GameState baseline persistence.

## Prerequisite (on `main` @ `73ddb4fb`)

| Shipped                         | Anchor                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Advisory + hotline incident path | [SPE-2639](https://linear.app/spectranoir/issue/SPE-2639) — PR #3188                                               |
| Evaluate-from-GameState helpers | [SPE-2638](https://linear.app/spectranoir/issue/SPE-2638) — PR #3186                                                |
| Five channel GameState maps     | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632)–[SPE-2636](https://linear.app/spectranoir/issue/SPE-2636) |
| Channel evaluators              | SPE-2629 / 2630 / 2631                                                                                              |
| Authored EXAMPLE fixtures       | `EXAMPLE_DISCUSSION_*` / `EXAMPLE_SURVIVOR_*` / `EXAMPLE_MEMORY_STABILIZATION_*`                                    |

## Path contract

- **Parallel lanes** — advisory, hotline, async, survivor, and memory stay separate; no unified baseline merge.
- **FromGameState only** — resolve hydrated maps via SPE-2638 helpers; never call evaluators from UI.
- **Material influence** — async `widened`/`recorded` + non-null adjustment; survivor `recorded` + non-null adjustment; memory `stabilized` + non-null adjustment.
- **Incident id match** — skip a lane when its lane `incidentId` (or advisory/hotline baseline `incidentId`) ≠ path `incidentId`.
- **Empty maps** — evaluator missing-channel no-ops; lane material flags false (must not false-satisfy parent AC).

## Scope

| In                                                                       | Out                                   |
| ------------------------------------------------------------------------ | ------------------------------------- |
| Extend `applySpe956ParticipatoryChannelsToIncident` with three lanes     | Evaluator contract changes            |
| EXAMPLE riverside async + survivor + memory path inputs                  | Week-close channel tick               |
| Focused Vitest: material deltas + empty `{}` no-op + immutability + skip | Mirror UI / store mutations           |
| Slice doc + backlog handoff (primary leaves SPE-2639; slice 1 → Shipped) | GameState baseline persistence        |
|                                                                          | SPE-1682 / 860 / 911 / 875 expansions |
|                                                                          | Full SPE-956 parent Done              |

## Acceptance

- [x] Authored incident path applies async + survivor + memory via FromGameState with material resolved deltas
- [x] Empty `{}` / missing channels yield no material influence on those lanes
- [x] Input baselines unchanged; result frozen
- [x] Incident-id mismatch skips applicable lanes
- [x] No evaluator contract, mirror UI, or week-close changes
- [x] SPE-956 remains **Backlog**
- [x] Targeted tests + lint + `verify:backlog-handoff` green

## Deferred

| Item                                       | Suggested owner  | Why deferred                               |
| ------------------------------------------ | ---------------- | ------------------------------------------ |
| Week-close channel tick                    | SPE-956 sibling  | Alternative orchestration sibling          |
| GameState incident baseline persistence    | SPE-956 sibling  | Baselines still authored inputs this slice |
| Parent reconciliation / full umbrella Done | SPE-956 child    | Only after all parent AC bullets met       |

## Validation

- `npm.cmd run test:run -- src/test/spe956ParticipatoryChannelIncidentPath.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-parent-ac-incident-wire-up-slice-1.md`
- `planning/spe-956-async-discussion-surface-slice-1.md`
- `planning/spe-956-survivor-informal-registry-slice-1.md`
- `planning/spe-956-collective-memory-stabilization-slice-1.md`
- `src/domain/spe956ParticipatoryChannelPersistence.ts`
