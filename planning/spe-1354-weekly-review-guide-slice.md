# SPE-1354 weekly review guide

[SPE-1354](https://linear.app/spectranoir/issue/SPE-1354) owns player-facing weekly review. [Lane A claim CP-LANE-A-AFTER-5122-6B32](https://linear.app/spectranoir/issue/SPE-1354#comment-4d2cd489-30ca-4054-9022-82d0a5b7c64e) reserves the documentation slice on `codex/weekly-review-guide` from named MSI main `6b32f0b89928d04917e00920b63ce0351eb431c3`. SPE-3752 returned ready with a complete empty open and draft PR inventory.

The November 20 acceptance calls for compact weekly framing across staff, risks, relationships, and unresolved cases. The existing first-run guide describes strategic success. Add a short walkthrough of the shipped **Latest Report** with those four questions, next decisions, and the distinction between a quiet record and unavailable history. Keep the guide grounded in the current Front Desk and full report routes.

Use these anchors at the recorded base revision and recheck them on later revisions.

- `FrontDeskPage` renders the summary and navigation, the funding shortcut when funding changes, and the relationship shortcut and comparisons when qualifying records exist. [Summary and navigation](https://github.com/JamesJedi420/containment-protocol/blob/6b32f0b89928d04917e00920b63ce0351eb431c3/src/features/operations/FrontDeskPage.tsx#L1645-L1669) · [Funding](https://github.com/JamesJedi420/containment-protocol/blob/6b32f0b89928d04917e00920b63ce0351eb431c3/src/features/operations/FrontDeskPage.tsx#L1700-L1733) · [Relationships](https://github.com/JamesJedi420/containment-protocol/blob/6b32f0b89928d04917e00920b63ce0351eb431c3/src/features/operations/FrontDeskPage.tsx#L1862-L1908).
- `buildLatestReportView` projects recorded weekly changes and current unresolved cases. [Front Desk projection](https://github.com/JamesJedi420/containment-protocol/blob/6b32f0b89928d04917e00920b63ce0351eb431c3/src/features/operations/frontDeskView.ts#L1726-L1767).
- `ReportDetailPage` loads the selected historical report by week from the route. [Report detail](https://github.com/JamesJedi420/containment-protocol/blob/6b32f0b89928d04917e00920b63ce0351eb431c3/src/features/report/ReportDetailPage.tsx#L35-L49).

Check the guide against the current labels, projection and focused Front Desk tests. SPE-3348 selects repository validators. The reservation covers only this slice record and `docs/first-run-week-loop.md`. SPE-1354 remains In Progress for broader weekly review acceptance.

## Keyboard entry to the completed report

Lane A reservation `CP-LANE-A-AFTER-5137-0CCB336` uses `codex/latest-report-dossier-focus` from clean MSI main `0ccb3360d06cfd4d1ea3c509af875129d3c4b24a`. SPE-3752 returned ready with the sole open PR #5128 held by Agent P. The approved weekly review distinguishes recorded outcomes from current unresolved work. From the Front Desk, the **Week N** link focuses the existing **Weekly report dossier** and provides the selected week as its accessible description. Tab continues to the first report control. Historical navigation, Back, direct entry, and report data keep their existing behavior.

`src/features/report/ReportFeature.test.tsx` covers the directed entry and the previous-week link. `e2e/a11y-keyboard-landmarks.spec.ts` checks the browser focus and selected week after normal week closes and reload, then checks Tab, previous-week navigation and Back. This verifies browser focus and accessible description.
