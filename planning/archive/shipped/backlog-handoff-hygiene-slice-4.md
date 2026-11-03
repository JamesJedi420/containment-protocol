# Backlog handoff hygiene pass (slice 4) — registry mirror slice index

One-page grooming record. Follows shipped [SPE-2442](https://linear.app/spectranoir/issue/SPE-2442) handoff hygiene slice 3 (PR #2758) and deferred `spe-848-*` / `spe-1615-*` index rows from `planning/backlog-handoff-hygiene-slice-3.md`.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | None (docs-only backlog hygiene)                                                                           |
| **Branch** | `spe-backlog-hygiene-slice-4`                                                                              |
| **Status** | Ready for PR                                                                                               |
| **Base `main` SHA** | `7bb3b0f6`                                                                                          |

## Goal

Close planning slice-index drift for shipped SPE-848 and SPE-1615 registry mirror stacks: add missing Shipped table rows and index all existing `spe-848-*` / `spe-1615-*` slice docs.

## Prerequisite (on `main` @ `7bb3b0f6`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Hygiene slice 3      | PR #2758 @ `7bb3b0f6` — `spe-1908-*` / `spe-2016-*` indexed; deferred this pass |
| SPE-848 parent       | [SPE-848](https://linear.app/spectranoir/issue/SPE-848) **Done** — slices 2–4 + registry anchor (SPE-2430) |
| SPE-1615 parent      | [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615) **Done** — slices 1–5 |

## Handoff drift fixed

| Artifact | Problem | Action |
| --- | --- | --- |
| `planning/backlog.md` § Shipped table | No rows for SPE-848 / SPE-1615 registry stacks | Added consolidated rows anchored at slice 4 / slice 5 docs |
| `planning/backlog.md` § Planning slice index | Missing `spe-848-*` (slices 2–4) and `spe-1615-*` (slices 1–5) rows | Added Shipped index rows with PR + merge SHA notes |
| `planning/backlog.md` § Context | SPE-848 / SPE-1615 parents not listed among shipped registry umbrellas | Context bullet added |
| `planning/backlog.md` § Recommended next step | Still pointed at this hygiene pass | Bump base SHA; next step → implementation queue (mission triage blocked) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `planning/backlog.md` handoff + shipped table + slice index rows   | Domain code                                   |
| Slice doc (this file)                                              | `spe-848-surveillance-tuning-registry-slice-1.md` (no file — anchor via SPE-2430) |
|                                                                    | Linear issue creation                         |
|                                                                    | Stale deferred-table edits in shipped slice docs |

## Acceptance

- [x] SPE-848 / SPE-1615 Shipped table rows present
- [x] All existing `spe-848-*` and `spe-1615-*` planning docs indexed as Shipped
- [x] Handoff base SHA and next-step current post hygiene
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mission triage institutional-label chips | Mission triage refresh | Blocked per `ux/mission-triage.md` |
| Stale deferred rows in shipped registry slice docs (e.g. SPE-1615 slice 5 lists SPE-848 slice 4 as deferred) | Optional follow-up | Out of slice-4 boundary — index/handoff only |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/backlog-handoff-hygiene-slice-3.md`
- `planning/spe-848-surveillance-tuning-registry-slice-4.md`
- `planning/spe-1615-psychological-resilience-registry-slice-5.md`
