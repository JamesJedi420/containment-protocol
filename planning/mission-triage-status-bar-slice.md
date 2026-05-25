# SPE-16 slice 4 — Mission triage operations status-bar tail (UX)

One-page implementation plan. Linear: [SPE-2258](https://linear.app/spectranoir/issue/SPE-2258/mission-triage-operations-status-bar-tail-slice-4-ux). Parent: [SPE-16 — Mission Intake, Triage, & Routing](https://linear.app/spectranoir/issue/SPE-16/mission-intake-triage-and-routing). Follows [SPE-2257](https://linear.app/spectranoir/issue/SPE-2257) / `planning/mission-triage-layout-slice.md`.

## Goal

When the player is on `/cases`, extend the global shell status strip with read-only triage queue chips (routable count, unassigned urgent) from the same projection as `MissionTriageContextFooter` — per `ux/navigation-map.md` optional extensions and `ux/mission-triage.md` deferred block.

## Non-goals

- Route / defer / ignore disposition actions (slice 5)
- New simulation math or second telemetry store
- Showing extensions on non-cases routes

## Acceptance

- [x] On `/cases` (and `/cases/:id` if shell is shared), shell tail shows routable + urgent chips
- [x] Chips link to cases list; aria labels include detail text
- [x] Other routes unchanged
- [x] Unit tests for signal builder + `ShellStatusBar` route guard
- [x] Lint + targeted Vitest green

## Branch

`spe-16-mission-triage-status-bar-slice-4`

## Audit notes (May 2026)

- Shell extension uses `buildMissionTriageBoardViews` (shared with `CasesPage` footer/tab counts) so metrics match the triage board filters.
- Chip `href` preserves canonical filter query via `writeCaseListFilters`.
- `buildMissionTriageShellExtensionSignals(game, views, casesHref)` takes pre-built board views; no parallel metrics helper.

## Follow-up (slice 5 — shipped)

Slice 5 disposition (Route now / Defer / Ignore on the triage detail panel) shipped in [PR #2359](https://github.com/JamesJedi420/containment-protocol/pull/2359). Plan: [planning/mission-triage-disposition-slice.md](mission-triage-disposition-slice.md). Slice 6 list-scan polish: [SPE-2259](https://linear.app/spectranoir/issue/SPE-2259) / [planning/mission-triage-list-scan-slice.md](mission-triage-list-scan-slice.md).
