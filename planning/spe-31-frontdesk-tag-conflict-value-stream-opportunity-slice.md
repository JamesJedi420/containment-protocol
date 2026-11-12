# SPE-31 — Front Desk town-tag conflict/value-stream opportunity slice

One-page implementation plan. Linear: [SPE-2465](https://linear.app/spectranoir/issue/SPE-2465).

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2465](https://linear.app/spectranoir/issue/SPE-2465) — Front Desk town-tag conflict/value-stream lead opportunity card |
| **Parent** | [SPE-31](https://linear.app/spectranoir/issue/SPE-31) |
| **Branch** | `spe-31-frontdesk-tag-conflict-value-stream-opportunity-slice` |
| **Status** | Shipped |
| **Base `main` SHA** | `71ce71e5` (PR #2848) |

## Goal

Surface one deterministic Front Desk opportunity card that highlights a shared-region tag conflict and classifies it into a value-stream lead using existing case tags and existing hub card patterns.

## Scope

| In | Out |
| --- | --- |
| Read-only projection from existing `cases`, `regionTag`, and `tags` | New simulation subsystem |
| Front Desk opportunity card rendering + links to existing routes | Mission triage expansion |
| Focused Front Desk tests for show/hide behavior | New persistence fields |

## Acceptance

- [x] Card appears when at least two non-resolved cases share a region tag and carry conflicting tag groups
- [x] Card stays hidden when conflict conditions are absent
- [x] Card exposes one value-stream lane and links to existing routes
- [x] Existing courier/procurement/staffing opportunity cards are unaffected
- [x] `npm run test:run -- src/features/operations/FrontDeskPage.test.tsx` passes
- [x] `npm run lint` passes

## Shipped

PR [#2848](https://github.com/JamesJedi420/containment-protocol/pull/2848) @ `71ce71e5`. Child [SPE-2465](https://linear.app/spectranoir/issue/SPE-2465) **Done** on Linear.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Multi-card ranking across all region conflicts | SPE-31 follow-up child | Keep slice deterministic and bounded to one opportunity card |
| Rich town/actor packet ingestion from generation systems | SPE-31 follow-up child | Reuse current case tags first; avoid parallel modeling |
| Front Desk hub rumor/opportunity surfacing | SPE-31 follow-up child | Next recommended slice — reuse `generateHubState` / `hubProjection` |
