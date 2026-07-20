# Post-SPE-2647 handoff reconciliation (docs)

One-page hygiene plan. Linear: [SPE-2650](https://linear.app/spectranoir/issue/SPE-2650). Docs-only after [SPE-2647](https://linear.app/spectranoir/issue/SPE-2647) merge.

| Field                | Value                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Linear**           | [SPE-2650 — Post-SPE-2647 handoff reconciliation (docs)](https://linear.app/spectranoir/issue/SPE-2650) |
| **Status**           | **In progress**                                                                                |
| **Parent / related** | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) remains **Done**; no named next primary |
| **Branch**           | `spe-2650-post-spe-2647-handoff-reconciliation`                                                 |
| **Base `main` SHA**  | `2640db8c`                                                                                     |

## Goal

Mark SPE-2647 and SPE-2649 **Shipped** in backlog/manifest and set **primary** / **In progress** to **(none)**. No new implementation sibling named this slice.

## Scope

| In                                                                 | Out                                      |
| ------------------------------------------------------------------ | ---------------------------------------- |
| `planning/backlog.md` + `planning/backlog-handoff-manifest.json`    | Application / domain code (`src/`)       |
| SPE-2647 + SPE-2649 slice docs → Shipped                           | Naming a new primary implementation issue |
| Primary → (none); In progress → (none)                             | Reopening SPE-956 AC                     |
| This handoff slice doc only                                        |                                          |

## Acceptance

- [x] SPE-2647 and SPE-2649 listed **Recently shipped**; not In Progress
- [x] Primary is (none); In progress is (none)
- [x] `npm run verify:backlog-handoff` green
- [x] No `src/` changes
- [ ] Child Done only after merge

## Status finding (binding)

EXAMPLE path baseline resolve wire ([SPE-2647](https://linear.app/spectranoir/issue/SPE-2647)) shipped via PR #3208. Prior handoff ([SPE-2649](https://linear.app/spectranoir/issue/SPE-2649)) that pointed primary at SPE-2647 is also **Shipped**. No preferred SPE-956 post-Done sibling remains named — pick next from backlog when ready.

## Deferred

| Item                                         | Suggested owner | Why deferred                                      |
| -------------------------------------------- | --------------- | ------------------------------------------------- |
| Next SPE-956 (or other) implementation pick  | Backlog / owner | No named primary this handoff                     |

## Validation

- `npm.cmd run verify:backlog-handoff`
- Confirm `git diff --stat` has no `src/` paths

## See also

- `planning/spe-2647-example-incident-path-baseline-resolve-wire-slice-1.md`
- `planning/spe-2649-post-spe-2646-handoff-reconciliation-slice-1.md`
- `planning/spe-2648-post-spe-2644-handoff-reconciliation-slice-1.md`
- `planning/backlog.md`
