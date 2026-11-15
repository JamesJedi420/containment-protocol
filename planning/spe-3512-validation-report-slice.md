# SPE-3512 — Supplied validation report adapter

| Field      | Value                                                                             |
| ---------- | --------------------------------------------------------------------------------- |
| **Status** | **See Linear**                                                                    |
| Issue      | [SPE-3512](https://linear.app/spectranoir/issue/SPE-3512); partial implementation |
| Parent     | SPE-3511; incomplete                                                              |
| Branch     | `codex/validation-report-adapter`                                                 |
| Base       | `52fec684bb90f596c9c931125ac9353714d5a7bb`                                        |

Normalize supplied SPE-3348 reports into the existing summary source contract. Keep selection distinct from execution, preserve canonical status and enforcement, validate caller-supplied provenance, and remain partial. Never infer a complete or successful zero from filtered, missing, unverified or failed data. Raw details and command output are excluded. Use explicit workstream evidence or retain unknown; caller declarations do not authenticate the evidence.

No live collection, clock, environment, filesystem, credentials, external app, scheduling, classifier, queue, selector, dependency or unrelated compiler change is authorized. The remaining issue acceptance and parent remain open. #4990 merged independently after the original preflight. #4991 retains its no-takeover hold; recheck all open PRs before merge.

Verify constructed adapter output through both summary renderers, malformed and contradictory inputs, missing required checks, exceptions, status and workstream handling, prior success, determinism and minimized output. Run the registered requirement selector and required checks, independent final-head review and CI before merge. Record exact results and lifecycle in the existing Linear issue.
