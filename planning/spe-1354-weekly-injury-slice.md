# SPE-1354 weekly staff injuries

[SPE-1354](https://linear.app/spectranoir/issue/SPE-1354) owns weekly review, with James Dye as the Linear owner. Lane A claim `CP-LANE-A-AFTER-5120-67FA` assigns the staff injury cue to Codex on `codex/weekly-injury-report` from named MSI main `67fa31640614c674aa4ce52411a93d4c9eb9c5d0`. SPE-3752 returned ready with an empty open and draft PR inventory.

Latest Report uses the existing completed report event window to show recorded injury severity and a link to current readiness when the agent record still exists. Missing report history and a week with no recorded injuries have distinct messages. The report uses the same injury events as the event feed, and the destination reads current readiness from the existing agent record.

Acceptance covers a controlled campaign imported through Operations Desk, a real Cases assignment and week close, persistence across reload, and keyboard navigation to the affected agent. The focused UI regression covers missing history, quiet history, neighboring events, duplicate event IDs, and an absent roster record. SPE-3348 selects repository checks. Recovery transitions, deployment eligibility rules, persistence, and other weekly cues remain outside this slice. SPE-1354 stays In Progress for broader weekly-review acceptance.
