# SPE-1354 weekly staff injuries

[SPE-1354](https://linear.app/spectranoir/issue/SPE-1354) owns weekly review, with James Dye as the Linear owner. Lane A claim `CP-LANE-A-AFTER-5120-67FA` assigns the staff injury cue to Codex on `codex/weekly-injury-report` from named MSI main `67fa31640614c674aa4ce52411a93d4c9eb9c5d0`. SPE-3752 returned ready with an empty open and draft PR inventory.

Latest Report uses the existing completed report event window to show recorded injury severity and a link to current readiness when the agent record still exists. A disclosure opens any records beyond the three most recent. Missing report history and a week with no recorded injuries have distinct messages. The report uses the same injury events as the event feed, and the destination reads current readiness from the existing agent record.

Acceptance covers a controlled campaign imported through Operations Desk, a real Cases assignment and week close, persistence across reload, and keyboard navigation to the affected agent. The focused UI regression covers missing history, quiet history, neighboring events, duplicate event IDs, absent roster records, and access to the fourth injury. SPE-3348 selects repository checks. Recovery transitions, deployment eligibility rules, persistence, and other weekly cues remain outside this slice. SPE-1354 stays In Progress for broader weekly-review acceptance.

## Keyboard arrival at current readiness

[Lane A reservation](https://linear.app/spectranoir/issue/SPE-1354#comment-a34aaf59-388e-4e59-8240-d3bd1af17cab) covers the injury readiness links and their agent-detail destination on `codex/latest-report-injury-readiness-focus` from clean MSI main `b7557ea9601774c72825742966461bc64e9c066f`. SPE-3752 returned ready with the independent #5128 hold.

Following an injury readiness link in the same tab focuses **Operational snapshot**, where deployment eligibility and recovery are shown. The existing URL still identifies the operative. Direct entry and Back retain their existing focus behavior, and changing tabs does not replay the handoff. The focused component regression verifies arrival and later tab navigation. Chromium verifies the report link after an actual assignment, injury at week close, and reload. Acceptance and source checks are direct because the evidence is small. SPE-1354 remains In Progress.
