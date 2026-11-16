# SPE-3752 — Evidenced open-PR triage maintenance

| Field               | Value                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Status**          | **See Linear**                                                                             |
| Owner               | [SPE-3752](https://linear.app/spectranoir/issue/SPE-3752); human James Dye; executor Codex |
| Canonical subsystem | SPE-3337 session preflight, historical Done delivery preserved                             |
| Workstream          | Shared system; CP tooling workflow consumed by Academy                                     |
| Branch              | `codex/open-pr-triage-maintenance`                                                         |
| Base/main           | `6fc96ebe18b4fc019dda5d1b3faeb17827a582da`                                                 |

## Approved boundary

James's November 14, 2026 delegation in chat `6af8e83b-c138-8191-9cbf-a9e45f725000` authorizes revising the blanket open-PR stop gate. Inspect every open PR including drafts, prioritize work the executor can advance, and permit otherwise approved non-overlapping work after current concrete blocker or accepted active-executor evidence plus next actions. An acceptance clarification allows the selected authorized PR to resume alongside independent actionable drafts so they cannot mutually deadlock; actionable PRs still prevent a fresh start.

Modify only the existing read-only session-preflight evaluator, collector, presentation, focused tests and controlling guidance. Source references are observations, never approval or a lock. Retain one active owned boundary, explicit holds, complete inventory, freshness, head/state consistency, path/dependency independence, scope and lifecycle authority, clean current main, required validation, independent full-diff review and merge closeout. Legacy inputs retain conservative behavior.

## Existing PR evidence and holds

Starting exact-head review evidence: #4990 at `cab8ed4b956bd1fa7a1d49a9b54a8ffbb5bc70f0` has four documentation corrections (procedural clock prefixes, full reset exception, rendered reset summary and event-specific rejection). #4991 at `ab94d089219f9b447300ab0b862482752e6a3cd7` has mirror-routing corrections (C533 to SPE-854; SPE-3019 support for C537). Both remain under the explicit no-takeover instruction for this slice. Their authors must repair and obtain fresh review; draft status, shared authorship and old handoffs are not treated as active executor evidence. Freshness checks must confirm current heads/reviews/CI before relying on these observations.

Their audit notes and harvest mirror/index do not overlap this slice's tooling, governance or handoff files. SPE-3752 has no dependency on either PR. Do not repair or merge them, implement compiler proposals, change gameplay/dependencies/CI policy, create another queue/approval/lock system, reopen SPE-3337, or modify unrelated worktrees.

## Checkable acceptance and validation

- Complete paginated inventory includes drafts; collect full file lists, both rename paths, and recheck PR metadata/inventory. Fail closed on incomplete or changing evidence.
- Each other PR has a current head/state-bound disposition, source, next action, and independent dependency observation. Blocked/active-owner dispositions require their specific evidence. Unknown, stale, contradictory, overlapping or dependent observations cannot yield readiness.
- Resume exactly one matching verified issue/branch on its actual head; include actual diff paths. Independently actionable drafts do not prevent advancing that selected boundary. They still block starting fresh work.
- Preserve independent scope/Linear lifecycle/current-base/dirty-checkout gates; JSON/Markdown retain sourced observations without granting authority.
- Run `npm run verify:session-preflight`, `npm run verify:governance-contract`, `npm run verify:backlog-handoff` and SPE-3348-selected validation from `npm run verify:requirements -- --base origin/main`. Record actual results and limitations in PR/Linear evidence.
- Open the PR as a draft initially, obtain independent full-diff review and required CI, then merge, sync clean main and perform acceptance-based Linear closeout.

The code anchors for this branch are `scripts/session-preflight-pr-triage.mjs` (`validateOpenPrTriage`, `evaluateOpenPrTriage`), `scripts/session-preflight.mjs` (`collectGitHubEvidence`), and the existing core/presentation consumers. Base anchors describe the starting revision above; implementation line numbers are valid only at the reviewed PR head.

## Checkpoints and evidence limits

Pre-implementation Hermes acceptance mapping was attempted once with configured local Qwen3.5 9B (`pr-triage-design-checkpoint.log`, session evidence outside the repository). It returned unsupported source anchors; those claims were rejected and bounded direct inspection used. No measured savings claimed. Short validator checks stay direct; no external research, frontend guidance or dependency security lookup is applicable to this tooling-only boundary. Post-review and post-merge checkpoints assess actual evidence volume and use the documented direct fallback where needed.

Current execution results belong in the PR and SPE-3752 comments. Do not label this slice Done until the full shipping acceptance is verified. No in-boundary deferrals or new candidate scope have been identified.

## November 16 corrective continuation

James explicitly requested fixing preflight caller friction and confirmed that eligible
work must also be possible when Codex has its own open PR. Reuse SPE-3752 for this
bounded correction; its lifecycle was restored to In Progress without changing James,
its scope or relationships. SPE-3337's completed historical delivery is unchanged.

At base `b1a41a20fbbba26e4224eb4f9f26ea63c051e2cb`, the existing evaluator and regression
already permit a genuinely blocked owned PR to remain paused. The adapter inherits
stdin unchanged. The caller gap was missing `openPrTriage` recovery guidance and a
complete boundary-plus-items example, not an absent author-specific exemption.

Only missing-packet reason details, caller documentation and focused regressions change.
Stable reason codes/statuses/exit behavior and all readiness predicates remain unchanged.
No automatic packet, owner, blocker or timestamp is invented. No governance, lifecycle
policy, credential, runtime, dependency, collector or CI enforcement changes.

A fresh complete GitHub inventory and six-file diff showed #5016 at
`d1e67749b07c6d9ea7566acf81814e36db9cdfd2`, paused under publication-only/no-merge approval.
Its paths and current Linear dependencies are independent. An isolated clean-main
structured start evaluation returned ready before the corrective branch was created.
The dashboard's separate nine-file worktree is preserved and is not modified here.
Historical #4993 closeout remains evidence of its actual delivery, not current readiness.

Acceptance: missing-triage start and multi-PR resume diagnostics point to the complete
caller contract without waiving blockers; real inherited-stdin transport preserves
caller bytes; the documented packet validates against constructed fixtures; stale,
overlapping and actionable owned-PR variants remain non-ready. Run focused preflight,
adapter, governance and required selected checks, then independent full-diff review and
normal draft PR/CI/merge closeout. Do not call fixture evidence a live start observation.
Hermes checkpoint: direct, bounded evidence volume does not justify delegation. No
external research or dependency-security review applies to this dependency-free change.
Current results and unresolved shipping gates are recorded in the PR/Linear closeout.
