# Post-SPE-2644 handoff reconciliation (docs)

One-page hygiene plan. Linear: [SPE-2648](https://linear.app/spectranoir/issue/SPE-2648). Docs-only after [SPE-2644](https://linear.app/spectranoir/issue/SPE-2644) merge.

| Field                | Value                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Linear**           | [SPE-2648 — Post-SPE-2644 handoff reconciliation (docs)](https://linear.app/spectranoir/issue/SPE-2648) |
| **Status**           | **Shipped**                                                                                |
| **Parent / related** | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) remains **Done**; [SPE-2646](https://linear.app/spectranoir/issue/SPE-2646) is next primary |
| **Branch**           | `spe-2648-post-spe-2644-handoff-reconciliation`                                                 |
| **Base `main` SHA**  | `34b99cef`                                                                                     |

## Goal

Mark SPE-2644 **Shipped** in backlog/manifest and set **primary** to [SPE-2646](https://linear.app/spectranoir/issue/SPE-2646) participatory channel weekly report-note surfacing. Record alternate [SPE-2647](https://linear.app/spectranoir/issue/SPE-2647) EXAMPLE path baseline resolve wire as deferred Backlog sibling.

## Scope

| In                                                                 | Out                                      |
| ------------------------------------------------------------------ | ---------------------------------------- |
| `planning/backlog.md` + `planning/backlog-handoff-manifest.json`    | Application / domain code (`src/`)       |
| SPE-2644 slice doc → Shipped                                       | Implementing SPE-2646 weekly notes       |
| Primary → SPE-2646; stub SPE-2646 slice doc                        | Implementing SPE-2647 path-wire          |
| Deferred table names SPE-2647                                      | Reopening SPE-956 AC                     |

## Acceptance

- [x] SPE-2644 listed **Recently shipped**; not In Progress
- [x] Primary points at SPE-2646
- [x] SPE-2647 named as deferred alternate (unused `resolveSpe956IncidentBaselines` is intentional)
- [x] `npm run verify:backlog-handoff` green
- [x] No `src/` changes
- [ ] Child Done only after merge

## Status finding (binding)

Preferred next sibling is **weekly report-note surfacing** ([SPE-2646](https://linear.app/spectranoir/issue/SPE-2646)). Alternate thin wire of `resolveSpe956IncidentBaselines` into EXAMPLE incident-path builders is [SPE-2647](https://linear.app/spectranoir/issue/SPE-2647) (Backlog). Do **not** treat unused resolve as a bug — SPE-2644 intentionally stopped at sanitize/hydrate + resolve.

## Deferred

| Item                                         | Suggested owner | Why deferred                                      |
| -------------------------------------------- | --------------- | ------------------------------------------------- |
| Participatory channel weekly report notes    | SPE-2646        | This slice is docs handoff only                   |
| EXAMPLE path baseline resolve wire           | SPE-2647        | Alternate after preferred weekly notes            |

## Validation

- `npm.cmd run verify:backlog-handoff`
- Confirm `git diff --stat` has no `src/` paths

## See also

- `planning/spe-956-gamestate-incident-baseline-persistence-slice-1.md`
- `planning/spe-956-participatory-channel-weekly-report-note-slice-1.md`
- `planning/spe-2645-post-spe-2643-handoff-reconciliation-slice-1.md`
- `planning/backlog.md`
