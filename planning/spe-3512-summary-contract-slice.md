# SPE-3512 — Snapshot-to-summary contract slice

| Field      | Value                                                                                   |
| ---------- | --------------------------------------------------------------------------------------- |
| **Status** | **See Linear**                                                                          |
| Issue      | [SPE-3512](https://linear.app/spectranoir/issue/SPE-3512) — partial implementation only |
| Parent     | SPE-3511; unchanged, incomplete                                                         |
| Executor   | Codex; existing human assignment unchanged                                              |
| Branch     | `codex/engineering-summary-contract`                                                    |
| Base/main  | `454087dfea2e9ed7ecaf516f06269059eeebd3b6`                                              |

James's coordinator delegation in chat `6af7c285-b1b0-8191-a92f-07df4d943034` explicitly authorizes this existing-issue tooling slice and normal shipping. It does not authorize external app placement or a full-dashboard implementation. Fresh source reads confirmed SPE-3512 Backlog/unassigned before it was set In Progress; no active overlapping implementation was observed. The existing SPE-3338 investigation retains its pending producer-boundary decision. No new issue or owner is introduced.

## Boundary and acceptance

Implement a pure deterministic supplied-snapshot contract, machine and human-readable summaries, focused tests, operator documentation and registration in the existing validator selector. Require explicit workstream/window/evaluation time/freshness/revision/resource policy. Complete fresh successful no-events must differ from partial/stale/unavailable/conflicted. Failed GitHub reads have unknown counts and retain supplied current error/last-success metadata. Verify coverage, revisions, duplicates, temporal boundaries, workstream filtering and secret-minimized output.

Reuse the canonical approved-work projector, handoff readiness, validator results, supplied drift classifications and supplied selector recommendations. Do not create another classifier, queue, producer, recommendation/ranking authority or operational policy. Preserve source provenance and the distinction between caller attestations and actual live qualification. Tests use constructed fixtures; no live connectivity or usable queue is claimed.

Proposed/implemented paths: `scripts/engineering-summary.mjs`, its focused tests, `scripts/validation/engineering-summary-selection.check.mjs`, existing package/validator registration, README Scripts, `docs/engineering-activity-summary.md`, and this slice's manifest reference. All implementation anchors are revision-dependent; PR/Linear evidence records the reviewed head and exact lines.

## Holds and exclusions

At start, complete open-PR collection found #4990 head `cab8ed4b956bd1fa7a1d49a9b54a8ffbb5bc70f0` and #4991 head `ab94d089219f9b447300ab0b862482752e6a3cd7`, no drafts. Both retain explicit no-takeover holds and next action: author corrections followed by fresh review. Their audit/harvest paths and dependencies do not overlap this slice. Do not claim authorship/old comments as active execution. Recheck before shipping.

Excluded: live collectors or credentials, persistent access/cache, external repository/hosting/auth/audience decisions, Base44 source export or 403 diagnosis, payment/provider/permission changes, dashboard deployment/publication, scheduling, campaign/GameState/player UI, the unapproved compiler cleanup, unrelated PR repairs and pending feed-producer scope. Original checkout and other worktrees remain preserved; no desktop/browser control.

## Validation, checkpoints and truthful completion

Targeted contract tests and SPE-3348-selected checks are required, followed by an initially draft PR, independent exact-head full-diff review, required CI, merge/main sync and partial lifecycle evidence. SPE-3512 remains In Progress unless its entire existing acceptance is independently met; this slice alone cannot close it or its parent.

The bounded local Qwen3.5 9B Hermes acceptance-mapping attempt returned proposed tests but also unsuitable test-directory/new-drift suggestions. Those suggestions were rejected; applicable acceptance was directly verified. No measured savings, new classifier or full independent mapping pass is claimed. Short checks and bounded closeout comparisons stay direct; reassess substantial review/log triage if present. Frontend guidance and dependency review are not applicable: no browser behavior or dependencies change.

Results, PR/commit links, remaining acceptance and exact checked revision belong in SPE-3512 comments and the PR. No new candidate scope or in-boundary deferral is recorded by this slice.
