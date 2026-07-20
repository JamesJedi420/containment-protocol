# SPE-956 — EXAMPLE incident-path baseline resolve wire (post-Done follow-on)

One-page implementation plan. Linear: [SPE-2647](https://linear.app/spectranoir/issue/SPE-2647) (post-Done follow-on related to [SPE-956](https://linear.app/spectranoir/issue/SPE-956); does **not** reopen parent AC). Follows shipped [SPE-2644](https://linear.app/spectranoir/issue/SPE-2644) baselines + [SPE-2646](https://linear.app/spectranoir/issue/SPE-2646) weekly notes; handoff via [SPE-2649](https://linear.app/spectranoir/issue/SPE-2649).

| Field                | Value                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**           | [SPE-2647 — SPE-956 EXAMPLE incident-path baseline resolve wire (post-Done follow-on)](https://linear.app/spectranoir/issue/SPE-2647) |
| **Status**           | **In progress**                                                                                                                         |
| **Parent / related** | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — remains **Done**; this issue does not reopen AC                              |
| **Branch**           | `spe-2647-example-incident-path-baseline-resolve-wire-slice-1`                                                                          |
| **Base `main` SHA**  | `af276547`                                                                                                                              |

## Goal

Thin-wire `resolveSpe956IncidentBaselines` into EXAMPLE incident-path input builders so EXAMPLE path inputs prefer persisted GameState baselines when present and fall back to authored fixtures otherwise. Does not change `applySpe956ParticipatoryChannelsToIncident` contract or expand the composer.

## Prerequisite

| Shipped                       | Anchor                                                                 | PR    |
| ----------------------------- | ---------------------------------------------------------------------- | ----- |
| Incident baseline persistence | [SPE-2644](https://linear.app/spectranoir/issue/SPE-2644)              | #3200 |
| Weekly report notes           | [SPE-2646](https://linear.app/spectranoir/issue/SPE-2646)              | #3205 |
| Handoff (this primary)        | [SPE-2649](https://linear.app/spectranoir/issue/SPE-2649)              | TBD   |

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| EXAMPLE builder(s) in `spe956ParticipatoryChannelIncidentPath.ts`  | SPE-956 AC reopen / new AC rows            |
| `resolveSpe956IncidentBaselines` read in builders only             | `applySpe956ParticipatoryChannelsToIncident` signature change |
| Focused Vitest: persisted baselines vs fixture fallback            | Composer expansion beyond EXAMPLE builders |
| Slice doc + backlog handoff                                        | Evaluator / week-close / mirror changes    |
|                                                                    | SPE-1682 / 860 / 911 / 875; file-byte I/O  |

## Acceptance

- [x] EXAMPLE builders prefer persisted baselines when resolve returns a record
- [x] Missing baselines fall back to existing EXAMPLE fixtures
- [x] `applySpe956ParticipatoryChannelsToIncident` unchanged
- [x] Targeted Vitest green; lint green
- [ ] Child Done only after merge

## Deferred

| Item                              | Suggested owner | Why deferred                                      |
| --------------------------------- | --------------- | ------------------------------------------------- |
| SPE-1682 / 860 / 911 / 875        | Those parents   | Explicitly out of SPE-956 matrix boundary         |

## Validation

- Targeted Vitest for EXAMPLE builder + incident path integration
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-gamestate-incident-baseline-persistence-slice-1.md`
- `planning/spe-2649-post-spe-2646-handoff-reconciliation-slice-1.md`
- `src/domain/spe956IncidentBaselinePersistence.ts`
- `src/domain/spe956ParticipatoryChannelIncidentPath.ts`
- `planning/backlog.md`
