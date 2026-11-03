# SPE-956 — Participatory channel planning mirror UI (slice 1)

One-page implementation plan. Linear: [SPE-2637](https://linear.app/spectranoir/issue/SPE-2637) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped persistence slices 1–5 ([SPE-2632](https://linear.app/spectranoir/issue/SPE-2632)–[SPE-2636](https://linear.app/spectranoir/issue/SPE-2636)). Parent stays **Backlog**.

| Field               | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2637 — Participatory channel planning mirror UI (slice 1)](https://linear.app/spectranoir/issue/SPE-2637)                       |
| **Status**          | **Shipped**                                                                                                                           |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog**    |
| **Branch**          | `spe-956-participatory-channel-mirror-slice-1`                                                                                        |
| **Base `main` SHA** | `2af0aeec`                                                                                                                            |

## Goal

Ship a read-only planning mirror over the five persisted SPE-956 participatory channel GameState maps so operators can inspect hydrated channel envelopes without re-running SPE-2620–2631 evaluators or mutating store state.

## Prerequisite (on `main` @ `2af0aeec`)

| Shipped                        | Anchor                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Survivor informal registry map | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632) — `spe956ParticipatoryChannelPersistence.ts` |
| Collective memory channel map  | [SPE-2633](https://linear.app/spectranoir/issue/SPE-2633) — same module                                |
| Hotline channel map            | [SPE-2634](https://linear.app/spectranoir/issue/SPE-2634) — same module                                |
| Async discussion surface map   | [SPE-2635](https://linear.app/spectranoir/issue/SPE-2635) — same module                                |
| Community advisory body map    | [SPE-2636](https://linear.app/spectranoir/issue/SPE-2636) — same module; PR #3182                      |
| Mirror pattern                 | [SPE-2626](https://linear.app/spectranoir/issue/SPE-2626) — propagation graph mirror                   |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted channel records as labels; do not call SPE-2620 / 2628 / 2629 / 2630 / 2631 evaluators from UI.
- **Empty state** — when all five maps are `{}` after hydrate; empty ≠ parent AC met.
- **Nested fields as labels** — advisory stakeholder/scope arrays and async participation windows render as labels only.
- **Ordering** — byte-stable sort by record id within each channel table (code-unit order).
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Scope

| In                                                                         | Out                                     |
| -------------------------------------------------------------------------- | --------------------------------------- |
| `getSpe956ParticipatoryChannelMirrorView` + mirror page                    | Evaluator contract changes              |
| Route + Front Desk quick link                                              | Week-close channel tick                 |
| Focused Vitest: empty `{}` + EXAMPLE fixtures + page smoke                 | Store writes from mirror                |
| Slice doc + backlog handoff (primary leaves SPE-2636)                      | SPE-1682 / 860 / 911 / 875 expansions   |
|                                                                            | Full SPE-956 parent AC                  |

## Acceptance

- [x] Empty `{}` on all five maps shows empty mirror without throw or false AC claims
- [x] EXAMPLE fixtures for all five channel types surface as labels only
- [x] Projection is pure; mirror makes no store writes
- [x] Front Desk / ops route link matches SPE-2626 pattern
- [x] Focused Vitest + page smoke green; `npm run lint` green
- [x] SPE-956 remains **Backlog**

## Deferred

| Item                                              | Suggested owner | Why deferred            |
| ------------------------------------------------- | --------------- | ----------------------- |
| Week-close channel tick                           | SPE-956 sibling | Not required this slice |
| Compose/evaluate-from-GameState helpers (broader) | [SPE-2638](https://linear.app/spectranoir/issue/SPE-2638) | Primary handoff after mirror |
| SPE-956 parent AC (incident wire-up)              | SPE-956 siblings | Separate umbrella scope |

## Validation

- `npm.cmd run test:run -- src/features/operations/spe956ParticipatoryChannelMirrorView.test.ts src/features/operations/Spe956ParticipatoryChannelMirrorPage.test.tsx`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-participatory-channel-persistence-slice-5.md`
- `planning/spe-956-propagation-graph-surfacing-slice-4.md`
- `SCHEMA_REGISTRY.md` — SPE-956 participatory channel persistence section
