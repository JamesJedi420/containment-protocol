# SPE-3291 — Operational staff-time allocation

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **Status**        | **Recently shipped**                                      |
| **Linear**        | [SPE-3291](https://linear.app/spectranoir/issue/SPE-3291) |
| **Parent**        | SPE-1189 — remains Backlog                                |
| **Branch**        | `cursor/spe-3291-staff-time-allocation`                   |
| **Base main SHA** | `1a8d025f`                                                |

PR [#4243](https://github.com/JamesJedi420/containment-protocol/pull/4243) carries this delivery. Status rows describe the merged artifact; keep Linear In Progress until this PR merges and acceptance is verified.

## Approved boundary

The user approved the complete implementation plan: reusable canonical staff-time commitments with explicit staff identities, one campaign-week window, durable receipts, and an opt-in archive-workshop consumer. Existing records-review work orders provide destination and optional displaced-alternative identity. No automatic personnel selection, maintenance conversion, research integration, dependency additions, or generic scheduler.

## Contract

- Optional version-1 `staffTimeAllocations` records ID, week, explicit staff IDs and canonical post snapshots, destination, displaced alternative, and active/released status. Contributor count is the claimed amount, one canonical capacity unit each.
- Queries derive eligibility through SPE-3135. Active current-window claims withhold contributors; removal or post reassignment invalidates use without replacement. Invalid present data becomes an unavailable marker, never an empty/free pool. Missing legacy data remains absent.
- Pure commit/release commands revalidate revision tokens. Equivalent repeated commands are no-ops; changed payloads and overlapping contributors fail without mutation. Released IDs cannot be revived. One destination has one receipt per week.
- The existing workshop page selects one eligible analysis staff member for a queued/active records-review order, optionally naming another pending records-review order as displaced. Projection-owned data and centralized copy explain availability, receipts, and command reasons.
- Transient per-order gates withhold reserved staff from competing unreserved work. Opted-in orders require their valid commitment for staff-backed processing; mapped investigator-backed eligibility remains independent. Specialist cache, quality rules, and personnel stay with existing owners.
- Workshop claims release after the week-close processing attempt, including blocked attempts. Manual release cancels that reservation for its remaining week; other work regains the contributor. Later weeks can reserve again.
- Shared functions live in `staffTimeAllocation`; workshop-specific validation lives in `workshopStaffTime`. Store commands preserve atomic results. Hydration/normalization retain receipts and the unavailable marker; reset removes the ledger.

## Validation

- Full local regression passed: 863 files / 9,379 tests via eight bounded forks on Node 24. The default vmThreads attempt exited unexpectedly; hosted CI validates Node 22 with its configured pool.
- Final focused integration and boundary run passed 45 tests, followed by a 5-test panel run including keyboard activation. Focused tests demonstrate real reserved-order progress and zero displaced-order progress; success/blocked week-close release; duplicate/stale commands; conflicting/disjoint claims; removal/reassignment; malformed/sparse saves; multi-contributor deterministic replay; manual-save/export/localStorage persistence; legacy fallback; independent agents; UI announcements, invalid-contributor explanation, unavailable state, and reset.
- Typecheck baseline remains 673 diagnostics, with no new diagnostic locations/codes after source-line mapping. Lint, audit-index, backlog-handoff, and theme-contract checks pass. New/changed small artifacts are formatted; large pre-existing source/backlog formatting drift is preserved.
- Six iterative pre-ship passes covered scope/integration, edge cases, determinism/state, regressions, documentation, and cleanup. Fixes preserved the legacy single-derivation bound, unreserved fallback after older receipts, and owner release after a blocked attempt without depending on roster validity. No unresolved in-boundary findings.
- Native-control semantics, pointer activation, accessible labels/status announcements, and keyboard submission are tested. Responsive layout classes are implemented; browser/controller visual QA was not performed.

Advisor consultation is unavailable: its mandatory escalated launcher is prohibited by session tool policy. Root owns the six-pass audit, validation, and acceptance.

## Deferred

No approved in-boundary deferrals. SPE-3292 conversion and SPE-3343 research throughput remain separate existing owners. SPE-1189 parent completion is not claimed.
