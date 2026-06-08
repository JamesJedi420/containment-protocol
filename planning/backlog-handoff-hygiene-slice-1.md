# Backlog handoff hygiene pass (slice 1)

One-page grooming record. Follows shipped [SPE-2397](https://linear.app/spectranoir/issue/SPE-2397) exploit-access harvest deferral closure pattern.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2398 — Backlog handoff hygiene pass (fix stale next-step / planning index drift)](https://linear.app/spectranoir/issue/SPE-2398) |
| **Branch** | `spe-2398-backlog-handoff-hygiene-slice-1`                                                                 |
| **Status** | **Shipped** — SPE-2398 (PR TBD) @ `e959a647`                                                                 |
| **Base `main` SHA** | `e959a647`                                                                                          |

## Goal

Reconcile stale planning handoffs after [SPE-2349](https://linear.app/spectranoir/issue/SPE-2349) custody wire-up (PR #2566) and [SPE-2397](https://linear.app/spectranoir/issue/SPE-2397) harvest deferral merge: fix recommended next step, slice-9 index drift, and [SPE-868](https://linear.app/spectranoir/issue/SPE-868) shipped-table vs Linear **Done** mismatch.

## Prerequisite (on `main` @ `e959a647`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Integrated health bundle custody wire-up | [SPE-2349](https://linear.app/spectranoir/issue/SPE-2349) / PR #2566 — parent [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) **Done** |
| Exploit-access harvest deferral | [SPE-2397](https://linear.app/spectranoir/issue/SPE-2397) @ `64166238` |
| Post-incident review mirror stack | [SPE-2396](https://linear.app/spectranoir/issue/SPE-2396) / PR #2661 slice 27 — parent [SPE-868](https://linear.app/spectranoir/issue/SPE-868) **Done** on Linear |

## Handoff drift fixed

| Artifact | Problem | Action |
| --- | --- | --- |
| `planning/backlog.md` § Recommended next step | Cited shipped [SPE-2349](https://linear.app/spectranoir/issue/SPE-2349) custody wire-up | Replaced with owner-choice next targets (parent reviews / optional SPE-868 slice 28) |
| `planning/backlog.md` § Context | Listed [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) among open parents | Removed — parent **Done** on Linear |
| `planning/backlog.md` Shipped table — SPE-868 | “Parent stays open” vs Linear **Done** | Aligned to **Done**; deferred branching reward noted |
| `planning/backlog.md` slice index — slice-9 | **In progress** after PR #2566 | **Shipped** + PR #2566 anchor |
| `planning/backlog.md` slice index — slice-10 | Missing row | Added **Shipped** row |
| `planning/contained-person-integrated-health-bundle-slice-9.md` | Status banner **In progress** | **Shipped** @ PR #2566 |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `planning/backlog.md` handoff + index + SPE-868 shipped row        | Runtime code                                  |
| Slice doc (this file) + planning index row                         | Reopen [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) |
| Linear hygiene on [SPE-2398](https://linear.app/spectranoir/issue/SPE-2398) | SPE-868 branching reward slice 28 implementation |
| Optional comment on open parents                                 | Mission triage expansion                      |

## Acceptance

- [x] Recommended next step no longer cites shipped SPE-2349
- [x] Slice-9 index row **Shipped** with PR #2566 anchor
- [x] SPE-868 shipped table reads **Done** on Linear; deferred branching reward noted for owner
- [x] Context section no longer lists SPE-1889 as open parent
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-868 branching reward logic (slice 28) | [SPE-868](https://linear.app/spectranoir/issue/SPE-868) | Parent **Done** on Linear; deferred per slices 20–21 — owner must reopen AC before implementation |
| SPE-1309 / SPE-1888 parent acceptance reviews | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309), [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) | Grooming-only candidates in recommended next step — not this slice |
| Dedicated exploit-access content | — | Closed by SPE-2397; preserved |
| Mission triage expansion | — | Blocked |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/exploit-access-harvest-deferral-slice-1.md`
- `planning/scope-discipline-grooming-pass.md`
- `planning/post-incident-review-registry-slice-20.md` (branching reward deferral)
- `planning/post-incident-review-registry-slice-27.md`
