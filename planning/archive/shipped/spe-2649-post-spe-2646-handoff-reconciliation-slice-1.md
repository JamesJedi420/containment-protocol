# Post-SPE-2646 handoff reconciliation (docs)

One-page hygiene plan. Linear: [SPE-2649](https://linear.app/spectranoir/issue/SPE-2649). Docs-only after [SPE-2646](https://linear.app/spectranoir/issue/SPE-2646) merge.

| Field                | Value                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Linear**           | [SPE-2649 — Post-SPE-2646 handoff reconciliation (docs)](https://linear.app/spectranoir/issue/SPE-2649) |
| **Status**           | **Shipped**                                                                                    |
| **Parent / related** | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) remains **Done**; [SPE-2647](https://linear.app/spectranoir/issue/SPE-2647) is next primary |
| **Branch**           | `spe-2649-post-spe-2646-handoff-reconciliation`                                                 |
| **Base `main` SHA**  | `af276547`                                                                                     |

## Goal

Mark SPE-2646 **Shipped** in backlog/manifest and set **primary** to [SPE-2647](https://linear.app/spectranoir/issue/SPE-2647) EXAMPLE incident-path baseline resolve wire. Stub SPE-2647 slice doc.

## Scope

| In                                                                 | Out                                      |
| ------------------------------------------------------------------ | ---------------------------------------- |
| `planning/backlog.md` + `planning/backlog-handoff-manifest.json`    | Application / domain code (`src/`)       |
| SPE-2646 slice doc → Shipped                                       | Implementing SPE-2647 path-wire          |
| Primary → SPE-2647; stub SPE-2647 slice doc                        | Reopening SPE-956 AC                     |

## Acceptance

- [x] SPE-2646 listed **Recently shipped**; not In Progress
- [x] Primary points at SPE-2647
- [x] SPE-2647 slice doc stub present
- [x] `npm run verify:backlog-handoff` green
- [x] No `src/` changes
- [ ] Child Done only after merge

## Status finding (binding)

Preferred next sibling is **EXAMPLE path baseline resolve wire** ([SPE-2647](https://linear.app/spectranoir/issue/SPE-2647)). Weekly report-note surfacing ([SPE-2646](https://linear.app/spectranoir/issue/SPE-2646)) shipped via PR #3205. Do **not** treat unused `resolveSpe956IncidentBaselines` as a bug until SPE-2647 wires EXAMPLE builders.

## Deferred

| Item                                         | Suggested owner | Why deferred                                      |
| -------------------------------------------- | --------------- | ------------------------------------------------- |
| EXAMPLE path baseline resolve wire           | SPE-2647        | This slice is docs handoff only                   |

## Validation

- `npm.cmd run verify:backlog-handoff`
- Confirm `git diff --stat` has no `src/` paths

## See also

- `planning/spe-956-participatory-channel-weekly-report-note-slice-1.md`
- `planning/spe-2647-example-incident-path-baseline-resolve-wire-slice-1.md`
- `planning/spe-2648-post-spe-2644-handoff-reconciliation-slice-1.md`
- `planning/backlog.md`
