# SPE-31 — Front Desk hub rumor/opportunity lead slice

One-page implementation plan. Linear: [SPE-2466](https://linear.app/spectranoir/issue/SPE-2466).

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2466](https://linear.app/spectranoir/issue/SPE-2466) — Front Desk hub rumor/opportunity lead cards |
| **Parent** | [SPE-31](https://linear.app/spectranoir/issue/SPE-31) |
| **Branch** | `spe-31-frontdesk-hub-rumor-opportunity-slice` |
| **Status** | Shipped |
| **Base `main` SHA** | `71ce71e5` |

## Goal

Surface the top hub simulation opportunity and top hub rumor on Front Desk as bounded lead cards using existing `generateHubState` output.

## Scope

| In | Out |
| --- | --- |
| Read-only projection from `generateHubState` | New hub generators |
| Two Front Desk opportunity cards (hub opportunity + hub rumor) | Mission triage expansion |
| Confidence / misleading / filtered / access labels when present | New persistence fields |
| Links to factions and report | Dashboard panel redesign |

## Acceptance

- [x] Hub opportunity card appears when `generateHubState` returns at least one opportunity
- [x] Hub rumor card appears when `generateHubState` returns at least one rumor
- [x] Cards hidden when respective hub lists are empty
- [x] Links route to factions and report
- [x] Existing Front Desk opportunity cards unchanged
- [x] `npm run test:run -- src/features/operations/FrontDeskPage.test.tsx` passes
- [x] `npm run lint` passes

## Shipped

PR [#2849](https://github.com/JamesJedi420/containment-protocol/pull/2849). Child [SPE-2466](https://linear.app/spectranoir/issue/SPE-2466) **Done** on Linear.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Multi-card hub rumor/opportunity ranking | SPE-31 follow-up child | Bounded to top item per list |
| Strategic action budget surfacing | SPE-31 follow-up child | Separate umbrella scope |
