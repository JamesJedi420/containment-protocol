# SPE-31 — Front Desk multi-region tag-conflict ranking slice

One-page implementation plan. Linear: [SPE-2467](https://linear.app/spectranoir/issue/SPE-2467).

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2467](https://linear.app/spectranoir/issue/SPE-2467) — Front Desk multi-region tag-conflict ranking |
| **Parent** | [SPE-31](https://linear.app/spectranoir/issue/SPE-31) |
| **Branch** | `spe-31-frontdesk-tag-conflict-ranking-slice` |
| **Status** | Shipped |
| **Base `main` SHA** | `7a9ce0a2` (PR #2852) |

## Goal

When multiple region-tag conflicts exist across open cases, surface one deterministic Front Desk opportunity card for the highest-priority conflict instead of the first lexicographic region.

## Scope

| In | Out |
| --- | --- |
| Scored cross-region ranking in `buildTagConflictValueStreamOpportunityCard` | New simulation |
| One opportunity card still | Multi-card surfacing |
| Front Desk tests with 3+ conflicting regions + tie-break fixture | Hub rumor/opportunity ranking changes |
| Slice doc + backlog handoff | `generateHubState`, mission triage |

## Acceptance

- [x] Card shows top-ranked region when multiple regions qualify
- [x] Card hidden when no region qualifies
- [x] Sort is deterministic: conflict-group count desc, case count desc, region tag asc tie-break
- [x] Existing courier/procurement/staffing/hub opportunity cards unaffected
- [x] `npm run test:run -- src/features/operations/FrontDeskPage.test.tsx` passes
- [x] `npm run lint` passes

## Shipped

PR [#2852](https://github.com/JamesJedi420/containment-protocol/pull/2852) @ `7a9ce0a2`. Child [SPE-2467](https://linear.app/spectranoir/issue/SPE-2467) **Done** on Linear.

## Ranking

Per qualifying region (2+ open cases, 2+ tag-conflict groups):

1. **Primary:** count of present `TAG_CONFLICT_GROUPS` (higher wins)
2. **Secondary:** count of open cases sharing the region tag (higher wins)
3. **Tie-break:** `regionTag` lexicographic ascending

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Multi-card surfacing for all region conflicts | SPE-31 follow-up child | Keep one bounded opportunity card per slice |
| Strategic action budget surfacing | SPE-31 follow-up child | Separate deferred parent scope |
| Town-first contract generation | SPE-31 follow-up child | Avoid parallel modeling in projection slice |
