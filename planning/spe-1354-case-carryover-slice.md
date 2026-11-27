# SPE-1354 Weekly unresolved-case handoff

[SPE-1354](https://linear.app/spectranoir/issue/SPE-1354) owns player-facing weekly review. This slice covers the November 20 unresolved-case acceptance. James Dye remains the issue owner. Codex accepted the single `CP-LANE-A-20261124-2144-NEXT` claim on `codex/spe-1354-case-carryover` from MSI `main` at `f1f950cb3f25868651cf09124dc735edd9505102`. The live SPE-3752 preflight returned ready with zero open or draft PRs. PRs #5104 and #5105 already shipped the Week 1 guide and dossier pacing.

The Front Desk Latest Report previously showed aggregate trigger and outcome counts. It now lists a compact set of unresolved entries from the live Cases board. `buildWeeklyReport` supplies historical snapshots, and the board's current status determines which route and deadline the player sees. Consecutive snapshots supply recorded changes to status, stage, and open-case deadline. Missing comparison history and an empty case board have separate messages. Historical report notes, intel, and cases absent from the current board supply no new entries.

Acceptance covers two actual week closes, reload, and the route back to the existing Cases triage. Focused fixtures check reported change and quiet weeks, missing history, and the exclusion of archived cases and historical intel. The existing app workflow regression verifies that the new triage link and the assignment-history link keep separate destinations. Scope is limited to the Front Desk view and surface, affected component, app workflow and browser coverage, and this slice record. SPE-3348 selects the validation requirements. Simulation, timekeeping, persistence, visibility contracts, and the staff, relationships, and broader risks portions of SPE-1354 retain their existing owners and acceptance. SPE-1354 stays In Progress after this slice.

## Active operation progress

Lane A claim `CP-LANE-A-AFTER-5119-12C7` covers active-operation timing on `codex/weekly-active-case-progress` from named MSI `main` at `12c7244a81b562a07c1fa2b9ca0a2a406ff7cc89`. SPE-3752 returned ready with zero open or draft PRs at 08:12 UTC on November 27, 2026. SPE-1354 remains In Progress.

`buildReportCaseSnapshot` already records remaining operation time. `describeCaseCarryover` compares that value when the case was active in both reports, both snapshots recorded timing, and both reports precede the current campaign week. This last check excludes current-week imports, which can inherit a live timer during sanitization. An open-case deadline still describes the window to act. Missing or unchanged active timing produces no timing comparison, and the existing active-operation link opens the live case.

The Chromium scenario imports a starting campaign with one three-week incident, assigns Night Watch through Cases, closes two weeks, and checks the report before and after reload. It then follows the review link by keyboard and checks the live operation timer. Component coverage exercises older records with a missing timer, steady timing, and the transition from open to active. The slice covers only the Front Desk projection, its component test, the dedicated browser scenario, and this record.

## Player guide for active operation timing

The [Lane A reservation](https://linear.app/spectranoir/issue/SPE-1354#comment-653e9c80-af1f-4303-bc60-bcdde790a932) covers the first-run guide and this record on `codex/guide-active-operation-timing` from named MSI main `9ba921d6e48fd6ea27236c48dbc51266b90c3189`. Live SPE-3752 returned ready with the independent [#5128 owner hold](https://github.com/JamesJedi420/containment-protocol/pull/5128#issuecomment-7222546756). SPE-1354 remains In Progress.

The guide distinguishes the live time to act on an open case, the recorded operation-time comparison between completed reports, and the live **Remaining** timer in Cases. The [existing browser scenario](https://github.com/JamesJedi420/containment-protocol/blob/9ba921d6e48fd6ea27236c48dbc51266b90c3189/e2e/weekly-active-case-progress.spec.ts#L32) verifies the comparison and the action through the player entry point, with no runtime edit. SPE-3348 selects repository validation.

## Current operation countdown in Latest Report

The [Lane A reservation](https://linear.app/spectranoir/issue/SPE-1354#comment-af94079f-6bbf-4c2c-a3e5-70eefe146986) covers the Front Desk case rows, focused tests, and the corresponding guide wording on `codex/live-operation-countdown` from MSI main `96b3e4eb8f3a235f5c2195364e8510e7156c5d03`. SPE-3752 returned ready with the independent #5128 owner hold. SPE-1354 remains In Progress.

Each active row shows the same current countdown available in Cases when the live case records it. The row keeps its recorded week-to-week comparison and link to the operation. Open-case deadlines still describe time to act. The browser scenario verifies the live timer before a historical comparison is available, after another week close, after reload, and through the keyboard link to Cases. Component coverage verifies zero and missing timers and a live value different from the recorded report. Acceptance and documentation checks are direct because the evidence is small.

## Keyboard focus on arrival from Latest Report

[Lane A reservation](https://linear.app/spectranoir/issue/SPE-1354#comment-e534d3b0-b07c-4375-82d3-99e5d8fa257b) covers the Latest Report case links and their Cases destination on `codex/latest-report-case-focus` from MSI main `85fc3e68958467354419cdcffa182acb2cb6c5ab`. SPE-3752 returned ready with the independent #5128 hold. SPE-1354 remains In Progress.

The report links carry a focus handoff in router state. Cases moves focus to the selected case panel, or to the queue if the case is unavailable. The URLs still identify the same cases and direct Cases navigation keeps its ordinary focus behavior. The component workflow covers arrival from the report on open cases and the stale-target fallback. The browser scenario verifies arrival on the active case after two week closes and reload, then the next Tab into the case's first link. The open-case focus assertion failed on the base. Source and acceptance checks are direct because the scope is small.
