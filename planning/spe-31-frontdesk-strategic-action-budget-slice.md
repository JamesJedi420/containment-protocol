# SPE-31 — Front Desk strategic action budget slice

One-page implementation plan. Linear: [SPE-2468](https://linear.app/spectranoir/issue/SPE-2468).

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2468](https://linear.app/spectranoir/issue/SPE-2468) — Front Desk strategic action budget opportunity card |
| **Parent** | [SPE-31](https://linear.app/spectranoir/issue/SPE-31) |
| **Branch** | `spe-31-frontdesk-strategic-action-budget-slice` |
| **Status** | Shipped |
| **Base `main` SHA** | `1e6bb622` (PR #2854 @ `5c083422`) |

## Goal

Surface one deterministic Front Desk opportunity card that projects strategic-turn action budget pressure from existing `agency.supportAvailable` and committed in-progress deployments.

## Scope

| In | Out |
| --- | --- |
| Read-only `projectStrategicActionBudget` domain helper | New simulation subsystem |
| `buildStrategicActionBudgetOpportunityCard` wired through `getFrontDeskHubView` | Mission triage expansion |
| Front Desk tests for show/hide, lane label, links, regression | Hub rumor/opportunity or tag-conflict ranking changes |

## Acceptance

- [x] Card appears when configured support pool is below committed deployment demand
- [x] Card hidden when support pool covers demand or capacity is not configured
- [x] Card exposes one lead pressure lane with deterministic tie-break
- [x] Links route to agency and teams
- [x] Existing courier/procurement/staffing/tag-conflict/hub opportunity cards unaffected
- [x] `npm run test:run -- src/features/operations/FrontDeskPage.test.tsx src/test/strategicActionBudgetProjection.test.ts` passes
- [x] `npm run lint` passes

## Shipped

PR [#2854](https://github.com/JamesJedi420/containment-protocol/pull/2854) @ `5c083422`. Child [SPE-2468](https://linear.app/spectranoir/issue/SPE-2468) **Done** on Linear.

## Ranking

Per committed in-progress deployment (assigned team present):

1. Classify into one lane via priority: site incursion → recovery → construction → authority visit → investigation → exploration → administration
2. Score lanes by deployment count
3. **Primary:** lane score descending
4. **Tie-break:** lane id lexicographic ascending

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Town-first contract generation | SPE-31 follow-up child | Separate umbrella scope |
| Multi-lane action budget surfacing | SPE-31 follow-up child | Keep one bounded opportunity card |
