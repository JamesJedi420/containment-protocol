# Backlog handoff hygiene pass (slice 3)

One-page grooming record. Follows shipped [SPE-2442](https://linear.app/spectranoir/issue/SPE-2442) staff-duty cross-reconciliation surfacing (PR #2757) and post-merge handoff commit `34ade2c3`.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | None (docs-only backlog hygiene)                                                                           |
| **Branch** | `spe-backlog-hygiene-slice-3`                                                                              |
| **Status** | Ready for PR                                                                                               |
| **Base `main` SHA** | `34ade2c3`                                                                                          |

## Goal

Close backlog handoff drift after SPE-2442 merge: add missing Shipped table row for the SPE-1908 cross-reconciliation stack (slice 6 anchor), index `spe-1908-*` / `spe-2016-*` slice docs, and confirm SPE-2016 deferred link to slice 6.

## Prerequisite (on `main` @ `34ade2c3`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Staff-duty surfacing | [SPE-2442](https://linear.app/spectranoir/issue/SPE-2442) / PR #2757 @ `528d55a7` |
| Staff-duty compose   | [SPE-2441](https://linear.app/spectranoir/issue/SPE-2441) / PR #2755 |
| Post-merge handoff   | `34ade2c3` — next-step prose already pointed at hygiene pass           |

## Handoff drift fixed

| Artifact | Problem | Action |
| --- | --- | --- |
| `planning/backlog.md` § Shipped table | No row for SPE-1908 cross-reconciliation slices 1–6 | Added consolidated row anchored at slice 6 doc |
| `planning/backlog.md` § Recommended next step | Base SHA `528d55a7`; hygiene pass still listed as alternative | Bump base SHA; next step → registry mirror slice-index pass |
| Planning slice index | Missing `spe-1908-*` and `spe-2016-*` rows | Added Shipped index rows |
| `spe-2016-cross-system-reconciliation-slice-1.md` § Deferred | Staff-duty surfacing deferred to slice 6 | **Verified** — link `spe-1908-cross-system-reconciliation-slice-6.md` correct; slice 6 shipped (deferred row left unchanged — out of boundary) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `planning/backlog.md` handoff + shipped table + slice index rows   | Domain code                                   |
| Slice doc (this file)                                              | `spe-2016-cross-system-reconciliation-slice-1.md` deferred-table edit |
| SPE-2016 → slice-6 link verification                               | `spe-848-*` / `spe-1615-*` bulk index (deferred) |
|                                                                    | Linear issue creation                         |

## Acceptance

- [x] SPE-1908 cross-reconciliation Shipped table row present (slices 1–6 / PR #2727–#2757)
- [x] Handoff base SHA and next-step current post hygiene
- [x] `spe-1908-*` and `spe-2016-*` slice docs indexed as Shipped
- [x] SPE-2016 deferred link to slice 6 verified correct
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| `spe-848-*` / `spe-1615-*` slice index rows | Next registry mirror hygiene pass | Out of slice-3 boundary |
| SPE-2016 deferred-table row cleanup (surfacing now shipped) | Optional follow-up | Out of slice-3 boundary |
| Mission triage institutional-label chips | Mission triage refresh | Blocked per `ux/mission-triage.md` |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/backlog-handoff-hygiene-slice-2.md`
- `planning/spe-1908-cross-system-reconciliation-slice-6.md`
- `planning/spe-2016-cross-system-reconciliation-slice-1.md`
