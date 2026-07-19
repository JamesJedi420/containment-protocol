# SPE-956 — Participatory channel compose/evaluate-from-GameState helpers (slice 1)

One-page implementation plan. Linear: [SPE-2638](https://linear.app/spectranoir/issue/SPE-2638) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped mirror ([SPE-2637](https://linear.app/spectranoir/issue/SPE-2637), PR #3184) and persistence slices 1–5. Parent stays **Backlog**.

| Field               | Value                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2638 — Participatory channel compose/evaluate-from-GameState helpers (slice 1)](https://linear.app/spectranoir/issue/SPE-2638)                   |
| **Status**          | **In progress**                                                                                                                                         |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog**                        |
| **Branch**          | `spe-956-participatory-channel-compose-slice-1`                                                                                                         |
| **Base `main` SHA** | `14e39f36`                                                                                                                                              |

## Goal

Ship pure domain evaluate-from-GameState helpers that resolve hydrated SPE-956 participatory channel maps via existing `extractSpe956*` / `resolvePersisted*` and call existing SPE-2620–2631 evaluators — without UI, store mutations, evaluator contract rewrites, or week-close.

## Prerequisite (on `main` @ `14e39f36`)

| Shipped                        | Anchor                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Five channel GameState maps    | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632)–[SPE-2636](https://linear.app/spectranoir/issue/SPE-2636) — `spe956ParticipatoryChannelPersistence.ts` |
| Planning mirror UI             | [SPE-2637](https://linear.app/spectranoir/issue/SPE-2637) — PR #3184                                    |
| Channel evaluators             | SPE-2620 / 2628 / 2629 / 2630 / 2631                                                                    |
| Compose-from-GameState pattern | [SPE-2621](https://linear.app/spectranoir/issue/SPE-2621) — `composeSpe956PropagationGraphFromGameState` |

## Helper contract

- **Resolve then evaluate** — each helper takes GameState-like + channel id + remaining evaluation input (baseline / signal / call / session).
- **Missing / unsafe id** — `resolvePersisted*` returns null; existing evaluator no-op reason codes apply (no throw).
- **No UI path** — helpers are domain-only; mirror must not call them.
- **Null-proto safe** — reuse existing extract/resolve map iteration.

## Scope

| In                                                                         | Out                                     |
| -------------------------------------------------------------------------- | --------------------------------------- |
| Five `evaluate*FromGameState` helpers in persistence module                | Evaluator contract changes              |
| Focused Vitest: EXAMPLE + empty `{}` + unsafe ids + hydrate round-trip     | Week-close channel tick                 |
| Slice doc + backlog handoff (primary leaves SPE-2637; mirror → Shipped)    | UI / mirror / store mutations           |
|                                                                            | SPE-1682 / 860 / 911 / 875 expansions   |
|                                                                            | Full SPE-956 parent AC                  |

## Acceptance

- [x] Each helper resolves EXAMPLE persisted channel and matches direct evaluator call
- [x] Empty `{}` / missing id / unsafe id yield missing-channel no-ops without throw
- [x] Hydrate round-trip preserves EXAMPLE envelopes for helpers
- [x] No evaluator contract or UI/store changes
- [x] SPE-956 remains **Backlog**
- [x] Targeted tests + lint + `verify:backlog-handoff` green

## Deferred

| Item                                 | Suggested owner | Why deferred                         |
| ------------------------------------ | --------------- | ------------------------------------ |
| Week-close channel tick              | SPE-956 sibling | Alternative orchestration sibling    |
| SPE-956 parent AC (incident wire-up) | SPE-956 siblings | Separate umbrella scope             |

## Validation

- `npm.cmd run test:run -- src/test/spe956ParticipatoryChannelComposeFromGameState.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-participatory-channel-mirror-slice-1.md`
- `planning/spe-956-participatory-channel-persistence-slice-5.md`
- `planning/spe-956-propagation-graph-persistence-slice-2.md`
- `SCHEMA_REGISTRY.md` — SPE-956 participatory channel persistence section
