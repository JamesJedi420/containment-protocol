# Backlog handoff hygiene pass (slice 5) — post SPE-2465

One-page grooming record. Follows shipped [SPE-2465](https://linear.app/spectranoir/issue/SPE-2465) / PR #2848 and deferred `planning/backlog-handoff-hygiene-slice-4.md` next-step pointer.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-31](https://linear.app/spectranoir/issue/SPE-31) parent reopened **Backlog**; [SPE-2367](https://linear.app/spectranoir/issue/SPE-2367) marked **Duplicate** of [SPE-2368](https://linear.app/spectranoir/issue/SPE-2368) |
| **Branch** | `spe-backlog-hygiene-slice-5`                                                                              |
| **Status** | Ready for PR                                                                                               |
| **Base `main` SHA** | `71ce71e5`                                                                                          |

## Goal

Close planning handoff drift after SPE-2465 merge: refresh `planning/backlog.md`, mark the SPE-31 tag-conflict slice doc **Shipped**, and reconcile stale Linear state (SPE-2367 duplicate; SPE-31 parent auto-close vs deferred umbrella scope).

## Prerequisite (on `main` @ `71ce71e5`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| SPE-2465             | PR #2848 — Front Desk tag-conflict/value-stream opportunity card       |
| SPE-2416             | PR #2701 — Whitlock Carolers game-world docs (prior merge)             |

## Handoff drift fixed

| Artifact | Problem | Action |
| --- | --- | --- |
| `planning/backlog.md` § Recommended next step | Base SHA `b6e0f649`; no SPE-2465 | Bump to `71ce71e5`; name SPE-31 hub rumor/opportunity follow-up |
| `planning/backlog.md` § Context | No SPE-31 / SPE-2465 mention | Context bullet + parent Backlog note |
| `planning/backlog.md` § Shipped table | No SPE-2465 row | Added consolidated row |
| `planning/backlog.md` § Planning slice index | Missing `spe-31-frontdesk-tag-conflict-value-stream-opportunity-slice.md` | Added **Shipped** row |
| `planning/spe-31-frontdesk-tag-conflict-value-stream-opportunity-slice.md` | Status **In progress** | Mark **Shipped**; check acceptance |
| Linear SPE-2367 | Stale **In Progress** | **Duplicate** of shipped SPE-2368 / PR #2604 |
| Linear SPE-31 | **Done** while deferred scope remains | Reopen **Backlog** + comment |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `planning/backlog.md` handoff + shipped table + slice index rows   | Domain code                                   |
| `planning/spe-31-frontdesk-tag-conflict-value-stream-opportunity-slice.md` status | New implementation slice doc |
| Slice doc (this file)                                              | Mission triage expansion                      |
| Linear SPE-2367 duplicate + SPE-31 Backlog comment               | SPE-31 child issue creation (next session)    |

## Acceptance

- [x] Handoff base SHA `71ce71e5` and next step → SPE-31 hub rumor/opportunity follow-up
- [x] SPE-2465 Shipped table row + slice index row present
- [x] SPE-31 tag-conflict slice doc marked Shipped with acceptance checked
- [x] SPE-2367 closed as duplicate on Linear
- [x] SPE-31 parent Backlog + deferred-scope comment on Linear
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-31 child — Front Desk hub rumor/opportunity cards | New child under SPE-31 | Implementation slice; create issue + branch on next session |
| Multi-card tag-conflict ranking | SPE-31 follow-up child | Explicit deferral from SPE-2465 slice doc |
| Mission triage full refresh | SPE-16 | Blocked per `ux/mission-triage.md` |

## Recommended next implementation

**SPE-31 slice 2 — Front Desk hub rumor/opportunity surfacing**

- Reuse `generateHubState` / `getDashboardHubProjection` (already on Dashboard `OperationsDeskPanels`; missing on canonical Front Desk `/`).
- Boundary: top hub rumor + top hub opportunity cards on Front Desk; show/hide tests; links to factions/report.
- Files: `frontDeskView.ts`, `FrontDeskPage.tsx`, `FrontDeskPage.test.tsx`.

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/spe-31-frontdesk-tag-conflict-value-stream-opportunity-slice.md`
- `planning/backlog-handoff-hygiene-slice-4.md`
- `src/domain/hub/hubState.ts`
- `src/features/dashboard/hub/hubProjection.ts`
