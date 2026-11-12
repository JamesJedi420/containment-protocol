# SPE-956 — Parent AC incident wire-up — advisory + hotline path (slice 1)

One-page implementation plan. Linear: [SPE-2639](https://linear.app/spectranoir/issue/SPE-2639) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped compose helpers ([SPE-2638](https://linear.app/spectranoir/issue/SPE-2638), PR #3186). Parent stays **Backlog**.

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2639 — Parent AC incident wire-up — advisory + hotline path (slice 1)](https://linear.app/spectranoir/issue/SPE-2639)       |
| **Status**          | **Shipped** (PR #3188)                                                                                                           |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog** |
| **Branch**          | `spe-956-parent-ac-incident-wire-up-slice-1`                                                                                     |
| **Base `main` SHA** | `6072a008`                                                                                                                       |

## Goal

Ship a pure domain incident-path composer that materially applies advisory + hotline participatory channels via SPE-2638 `evaluate*FromGameState` helpers for one authored riverside incident — without evaluator rewrites, mirror UI, week-close, or GameState baseline persistence.

## Prerequisite (on `main` @ `6072a008`)

| Shipped                         | Anchor                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Evaluate-from-GameState helpers | [SPE-2638](https://linear.app/spectranoir/issue/SPE-2638) — PR #3186                                                |
| Five channel GameState maps     | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632)–[SPE-2636](https://linear.app/spectranoir/issue/SPE-2636) |
| Channel evaluators              | SPE-2620 / 2628                                                                                                     |
| Authored EXAMPLE fixtures       | `EXAMPLE_INCIDENT_BASELINE` / `EXAMPLE_HOTLINE_GUIDANCE_BASELINE` / support-routing signals                         |

## Path contract

- **Parallel lanes** — advisory (`IncidentResponseDecision`) and hotline (`HotlineGuidanceBaseline`) stay separate; no unified baseline merge.
- **FromGameState only** — resolve hydrated maps via SPE-2638 helpers; never call evaluators from UI.
- **Material influence** — advisory `adopted` + non-null adjustment; hotline `handled` + non-null adjustment.
- **Incident id match** — skip a lane when baseline `incidentId` ≠ path `incidentId`.
- **Empty maps** — evaluator missing-channel no-ops; `materialInfluence === false` (must not false-satisfy parent AC).

## Scope

| In                                                                       | Out                                   |
| ------------------------------------------------------------------------ | ------------------------------------- |
| `applySpe956ParticipatoryChannelsToIncident` domain composer             | Evaluator contract changes            |
| EXAMPLE riverside advisory + hotline path                                | Week-close channel tick               |
| Focused Vitest: material deltas + empty `{}` no-op + immutability        | Mirror UI / store mutations           |
| Slice doc + backlog handoff (primary leaves SPE-2638; compose → Shipped) | Async / survivor / memory lanes       |
|                                                                          | SPE-1682 / 860 / 911 / 875 expansions |
|                                                                          | Full SPE-956 parent Done              |

## Acceptance

- [x] Authored incident path applies advisory + hotline via FromGameState with material `supportRouting` deltas
- [x] Empty `{}` / missing channels yield no material influence
- [x] Input baselines unchanged; result frozen
- [x] No evaluator contract, mirror UI, or week-close changes
- [x] SPE-956 remains **Backlog**
- [x] Targeted tests + lint + `verify:backlog-handoff` green

## Deferred

| Item                                       | Suggested owner  | Why deferred                               |
| ------------------------------------------ | ---------------- | ------------------------------------------ |
| Week-close channel tick                    | SPE-956 sibling  | Alternative orchestration sibling          |
| Async / survivor / memory incident lanes   | [SPE-2640](https://linear.app/spectranoir/issue/SPE-2640) | Remaining parent AC channel bullets (slice 2) |
| GameState incident baseline persistence    | SPE-956 sibling  | Baselines still authored inputs this slice |
| Parent reconciliation / full umbrella Done | SPE-956 child    | Only after all parent AC bullets met       |

## Validation

- `npm.cmd run test:run -- src/test/spe956ParticipatoryChannelIncidentPath.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-participatory-channel-compose-slice-1.md`
- `planning/spe-956-community-advisory-decision-influence-slice-1.md`
- `planning/spe-956-hotline-channel-slice-1.md`
- `src/domain/spe956ParticipatoryChannelPersistence.ts`
