# SPE-16 slice 2 — Mission triage deferral comparison columns (UX)

One-page implementation plan. Parent: [SPE-16 — Mission Intake, Triage, & Routing](https://linear.app/spectranoir/issue/SPE-16/mission-intake-triage-and-routing). Follows [SPE-2255](https://linear.app/spectranoir/issue/SPE-2255) / `planning/mission-triage-covert-prep-slice.md`.

## Goal

On `CasesPage`, surface read-only **comparison columns** for infiltration/covert prep cost vs deferral/escalation risk vs escalation carryover — not chips only.

## Non-goals

- Full triage layout (filters/tabs/split panel/footer)
- New simulation math or store actions
- Major-incident rows

## Acceptance

- [x] In-progress eligible cases show 3-column compare table when covert or deferral signals apply
- [x] Columns use `triageMission` + existing prep views (no duplicate chip text)
- [x] Carryover cross-link when escalation-high or critical stage
- [x] Hidden for operational major-incident raid profiles (same gate as covert chips)
- [x] Covert prep detail matches strain source (infiltration vs forensic vs leave-behind vs concealment)
- [x] Tests + lint + test:run green

## Branch

`spe-16-mission-triage-deferral-compare-slice-2`
