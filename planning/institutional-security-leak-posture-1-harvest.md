# Harvest mirror - `institutional-security-leak-posture-1`

**Purpose:** Repository mirror of candidate adjudication for harvest batch `institutional-security-leak-posture-1`. Non-authoritative for Linear ownership, backlog shape, or implementation sequencing. Linear remains the source of truth.

**Canonical ledger:** [Candidate reconciliation ledger - institutional-security-leak-posture-1 (2026-11-12)](https://linear.app/spectranoir/document/candidate-reconciliation-ledger-institutional-security-leak-posture-1-ceff656675a2). Batch-level canonical-ledger synchronization outcome: **`applied`**.

**Batch:** `institutional-security-leak-posture-1` - **Candidates:** `C521-C530` (10) - **Reconciled:** 2026-11-12.

**Approval basis:** Phases 1-4 delegated by the human operator for the reconciling session under the standing instruction to run the same pipeline. Exceptional scope, canon, credential, and destructive actions stayed outside that delegation and were not attempted. Delegation is a session record, not a standing grant for later batches.

## Provenance and coverage

- Source: a community-edited fan encyclopedia page (CC BY-SA) describing one fictional media-production institution's internal security team; recovered through Stash item `HP6W-2BFE` after applying the `cp-sent` tag. The Stash item was a bare URL with no intake note.
- Read: the full article body, history sections, employee list, appearance list, gallery captions, and reference list (one page; 2026-11-12).
- Coverage limit: the page is a derivative encyclopedia entry, not a primary design document. Structural claims are weak evidence and every accepted candidate was independently re-anchored to current repo or Linear state before disposition.
- **No reproduced source content:** no proper nouns, franchise or setting labels, character or creator names, dialogue, or source URL appears in this doc, the Linear ledger, the issue comments, or any repo file. The Stash item ID is the durable provenance handle.

## Phase summary

| Phase                              | Result                                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 - assessment/decomposition | 10 candidates normalized to atomic CP concepts; `C521` and `C529` collapsed to reject because their only durable half already has an owner or no CP-native state                                               |
| Phase 2 - parent reconciliation    | No new parent; six existing owners cover every accepted concept                                                                                                                                                |
| Phase 3 - child/supporting work    | No new child; each accepted candidate is a field, guardrail, or acceptance case inside an existing boundary. Contradiction check **PASS**                                                                      |
| Phase 4 - writeback                | Ledger document created; 7 fold-in/contradiction comments on six owners; no issue created, retitled, reprioritized, reparented, relabeled, reassigned, or transitioned; no relationship or dependency mutation |

## Disposition counts (mirror vocabulary)

`fold_in=7; no_op=2; contradiction_check=1; documentation_only=0; missing_boundary_candidate=0`

`no_op=2` covers two ledger-level `REJECT` records (`C521`, `C529`). The mirror vocabulary has no separate reject value, so rejected candidates must not be read as accepted scope.

## Candidate outcomes

| ID   | CP concept                                                                                                                                   | Verdict | Disposition           | Matched owner(s) | Mirrored change                                                                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| C521 | Disclosure-protection mission framing: security objective is unpublished work product, severity graded by disclosure extent                  | deny    | `no_op`               | none             | Rejected: media-production nondisclosure has no CP-native state; leak half owned by SPE-551                                |
| C522 | Visit-scoped entry credential doubles as a retrospective trace key; confidence drops with shared, borrowed, tailgated, or cloned credentials | accept  | `fold_in`             | SPE-137          | Credential-read history and confidence-loss rule                                                                           |
| C523 | Alert tier widens search and temporary-custody authority while the triggering find stays weak; posture must not raise evidence grade         | accept  | `contradiction_check` | SPE-102, SPE-474 | Posture-versus-evidence guardrail; custody keeps its own ground                                                            |
| C524 | Suspicion detention requires recorded authority source, stated ground, and due review before a holding-site transfer completes               | accept  | `fold_in`             | SPE-474          | Required intake fields and receiving-site acknowledgment                                                                   |
| C525 | Valid credential, illegitimate purpose: insider exfiltration passes every credential check; role-baseline deviation is suspicion, not proof  | accept  | `fold_in`             | SPE-551          | Role-baseline detection vector and false-positive guardrail                                                                |
| C526 | Entry authorization is separate from egress integrity; a sealed credential regime can coexist with an unmonitored service route              | accept  | `fold_in`             | SPE-1263         | Acceptance case for independent egress assessment; Done owner, no lifecycle change                                         |
| C527 | Coerced genuine authenticator: compelling the authorized holder satisfies a person-bound factor, so spoof detection fails                    | accept  | `fold_in`             | SPE-137          | `compliant under duress` credential failure state                                                                          |
| C528 | Self-authorized disclosure exception: the rule-setting authority releases the material itself; authorization is not evidence of safety       | accept  | `fold_in`             | SPE-855          | Authority-source field plus self-grant finding                                                                             |
| C529 | Private institutional force exercises public police powers without jurisdiction or an oversight record                                       | deny    | `no_op`               | none             | Rejected: authority-legitimacy (SPE-1097) and jurisdiction admission (SPE-602) already own the boundary; no distinct state |
| C530 | Discreet reception summon is a low-visibility alert channel with travel delay and no evidence value by itself                                | accept  | `fold_in`             | SPE-102          | Channel definition with activation record and dispatch delay                                                               |

## Contradiction findings (Phase 3)

| #   | Conflict                                                                                                                                                                 | Resolution                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 1   | Response posture versus evidence grade: an alert tier authorizes search and custody but must not become a suspicion predicate                                            | SPE-102 owns posture; SPE-474 owns the intake ground; no shared state              |
| 2   | Credential validity versus access legitimacy: SPE-137 decides whether a credential is valid; SPE-551 decides whether an authorized access served an illegitimate purpose | No second credential validator; detection stays suspicion-only                     |
| 3   | Entry authorization versus egress integrity: formal access compliance can coexist with a porous service route                                                            | SPE-1263 already separates formal level from permeability; only the split is added |
| 4   | Suspicion detention versus contained-subject transfer: SPE-3439 requires an already-contained subject                                                                    | C524 stays in SPE-474 intake; does not consume or extend SPE-3439                  |
| 5   | Done-owner comment: a traceability comment on SPE-1263 must not reopen scope or imply pending implementation                                                             | Comment states candidate-only clarification and no lifecycle change                |
| 6   | Cumulative ledger: no prior batch reconciled this source; `C510-C520` contain no conflicting disposition                                                                 | `PASS`                                                                             |
| 7   | Translation and canon: structural mechanics only                                                                                                                         | `PASS`                                                                             |

Contradiction routing authorities inspected: SPE-2927, SPE-2928, SPE-2929, SPE-151.

## Owner map

| Owner                                                     | State at reconciliation | Fold-in scope                                                         |
| --------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------- |
| [SPE-137](https://linear.app/spectranoir/issue/SPE-137)   | Backlog                 | C522, C527 - entry-credential trace and coerced genuine authenticator |
| [SPE-102](https://linear.app/spectranoir/issue/SPE-102)   | Backlog                 | C523 (primary), C530 - alert posture and reception summon channel     |
| [SPE-474](https://linear.app/spectranoir/issue/SPE-474)   | Backlog                 | C523 (co-owner), C524 - custody ground and intake authority fields    |
| [SPE-551](https://linear.app/spectranoir/issue/SPE-551)   | Backlog                 | C525 - role-baseline exfiltration detection                           |
| [SPE-1263](https://linear.app/spectranoir/issue/SPE-1263) | Done                    | C526 - entry/egress split; traceability only, no lifecycle change     |
| [SPE-855](https://linear.app/spectranoir/issue/SPE-855)   | Backlog                 | C528 - self-authorized disclosure exception                           |

## Repo anchors checked (read-only)

- `src/domain/facilityZoningLockdown.ts` - SPE-292 access bands, alarm states, and lockdown circulation; no credential-read history.
- `src/domain/siteAlertStage.ts` - SPE-3008 reads only the canonical `full_site_alert` stage.
- `src/domain/closedFacilityPermeability.ts` - SPE-1263 formal security level versus permeability band and leak channels; hidden routes and body movement already listed.
- `src/domain/frontDeskTriggers.ts` - authored front-desk scene triggers only; not an alert channel.
- `src/domain/secureContainedSubjectTransfer.ts` - SPE-3439 transfer stages; requires an already-contained subject.
- `src/domain/patrolDoctrine.ts` - SPE-2271 patrol zones and escort policy.
- `src/domain/infiltrationEncounterReportNotes.ts` - badge-chain and shift-roster checks in infiltration reporting.
- `src/domain/facilityAutomationReset.ts` - `badgeOrAttunementPresent` input; no duress state.
- `planning/harvest-reconciliation-index.md` - this batch row.
