# SPE-16 slice 3 — Mission triage layout refresh (UX)

One-page implementation plan. Parent: [SPE-16 — Mission Intake, Triage, & Routing](https://linear.app/spectranoir/issue/SPE-16/mission-intake-triage-and-routing). Follows [SPE-2256](https://linear.app/spectranoir/issue/SPE-2256) / `planning/mission-triage-deferral-compare-slice.md`.

## Goal

Restructure `CasesPage` case queue toward `ux/mission-triage.md` §3: category tabs, split list/detail panel, and context footer — without new simulation math.

## Non-goals

- Replacing contract board block
- Route/defer/ignore store actions (still assignment-focused)
- Full status-bar shell extension (navigation-map tail deferred)

## Acceptance

- [x] Triage tabs (All / Incidents / Contracts / Leads / Escalating / Assigned) filter list via URL `tab`
- [x] Split layout: compact selectable list + detail panel for selected case
- [x] Context footer: support load, teams available, urgent-if-deferred, escalation carryover risk
- [x] Slice 1–2 row signals preserved in detail panel
- [x] Tests + lint + `npm run test:run` green

## Branch

`spe-16-mission-triage-layout-slice-3`

## Audit repairs (May 2026)

- `matchesCaseTriageTab` moved to `caseView.ts` (removed `caseView` ↔ `missionTriageLayoutView` circular import).
- `normalizeCaseListFilters` strips stale `case` URL ids not visible under current filters.
- `MissionTriageListRow` — title link and inspect control are siblings (no nested interactive elements).
- `filterHelpers.test.ts` updated for `tab` / `case` params; invalid `tab` falls back to `all`.
- Triage context footer renders even when the filtered list is empty.
- Tab change preserves `case` when the selection remains visible under the new tab; re-clicking the active tab is a no-op.
