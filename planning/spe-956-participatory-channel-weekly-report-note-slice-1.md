# SPE-956 — Participatory channel weekly report-note surfacing (post-Done follow-on)

One-page implementation plan. Linear: [SPE-2646](https://linear.app/spectranoir/issue/SPE-2646) (post-Done follow-on related to [SPE-956](https://linear.app/spectranoir/issue/SPE-956); does **not** reopen parent AC). Follows shipped [SPE-2643](https://linear.app/spectranoir/issue/SPE-2643) week-close tick + [SPE-2644](https://linear.app/spectranoir/issue/SPE-2644) baselines; handoff via [SPE-2648](https://linear.app/spectranoir/issue/SPE-2648).

| Field                | Value                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**           | [SPE-2646 — SPE-956 participatory channel weekly report-note surfacing (post-Done follow-on)](https://linear.app/spectranoir/issue/SPE-2646) |
| **Status**           | **In progress**                                                                                                                         |
| **Parent / related** | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — remains **Done**; this issue does not reopen AC                              |
| **Branch**           | `spe-956-participatory-channel-weekly-report-note-slice-1`                                                                              |
| **Base `main` SHA**  | `d15a212e`                                                                                                                              |

## Goal

Ship pure week-close report notes when the five SPE-956 participatory channel maps change under the SPE-2643 tick (`elapsedChannelWeeks` / `lastWeeklyTickWeek`). Wire into `advanceWeek` note append like SPE-2596. Empty/no-op maps emit no notes. Does not reopen SPE-956 AC.

## Prerequisite

| Shipped                       | Anchor                                                                 | PR    |
| ----------------------------- | ---------------------------------------------------------------------- | ----- |
| Week-close channel tick       | [SPE-2643](https://linear.app/spectranoir/issue/SPE-2643)              | #3196 |
| Incident baseline persistence | [SPE-2644](https://linear.app/spectranoir/issue/SPE-2644)              | #3200 |
| Handoff (this primary)        | [SPE-2648](https://linear.app/spectranoir/issue/SPE-2648)              | TBD   |
| SPE-947 weekly notes pattern  | [SPE-2596](https://linear.app/spectranoir/issue/SPE-2596)              | —     |

## Surfacing contract

- **Read-only compose** — compare pre-tick vs post-tick five channel maps; no evaluator calls.
- **Emit on change only** — channel `elapsedChannelWeeks` advance (and/or tick week stamp) from authored `weeklyElapsedWeeksDelta`.
- **Empty / no-op maps** — zero notes; no throw; no false AC.
- **Same-week idempotent re-tick** — unchanged maps emit no duplicate notes.
- **Safe labels** — CP-neutral copy; no franchise tokens.
- **Weekly note type** — `spe956_participatory_channel.weekly_transition` (tentative; register in audit).

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| Surfacing compose + weekly report note builder                     | SPE-956 AC reopen / new AC rows            |
| `advanceWeek` prior/next note append (SPE-2596 pattern)            | Evaluator / mirror rewrite                 |
| Report-note type registration (models / audit / view)              | Incident-path composer expansion           |
| Focused Vitest + advanceWeek integration                           | `resolveSpe956IncidentBaselines` path wire |
| Slice doc + backlog handoff                                        | Week-close tick logic changes              |
|                                                                    | SPE-1682 / 860 / 911 / 875; file-byte I/O  |

## Acceptance

- [x] Empty / no-op channel maps emit no weekly report notes
- [x] Authored elapsed-week transitions emit deterministic typed notes
- [x] Same-week idempotent re-tick does not duplicate notes
- [x] Notes CP-neutral; type registered in `reportNoteTypeAudit`
- [x] Wired into `advanceWeek` note append when maps change under SPE-2643 tick
- [x] `npm run lint` + targeted tests green; `npm run verify:backlog-handoff` green
- [ ] Child Done only after merge

## Deferred

| Item                              | Suggested owner | Why deferred                                      |
| --------------------------------- | --------------- | ------------------------------------------------- |
| EXAMPLE path baseline resolve wire | SPE-2647       | Alternate sibling; preferred weekly notes first   |
| SPE-1682 / 860 / 911 / 875        | Those parents   | Explicitly out of SPE-956 matrix boundary         |

## Validation

- Targeted Vitest for note builder + advanceWeek integration + `reportNoteTypeAudit`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-947-weekly-report-notes-slice-1.md`
- `planning/spe-956-participatory-channel-week-close-slice-1.md`
- `planning/spe-2648-post-spe-2644-handoff-reconciliation-slice-1.md`
- `src/domain/spe956ParticipatoryChannelWeeklyOrchestration.ts`
- `planning/backlog.md`
