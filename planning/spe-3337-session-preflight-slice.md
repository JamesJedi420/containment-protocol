# SPE-3337 Slice A — session-conflict and handoff-readiness preflight

| Field | Value |
| --- | --- |
| Linear | [SPE-3337 — Approved implementation session continuity](https://linear.app/spectranoir/issue/SPE-3337/approved-implementation-session-continuity) |
| Status | In Progress |
| Ownership | Shared-system-owned; Containment Protocol Tooling / Developer Experience |
| Branch | `codex/spe-3337-session-preflight` |
| Base main | `265cf70ba2c6d14c5a583ba512333fff1e409736` |
| Delivery | First of two sequential non-child slices under SPE-3337 |

## Goal

Implement a versioned, read-only preflight for one already-approved, explicitly named implementation boundary. The preflight must distinguish a safe start or resume from known conflicts and unverifiable evidence without selecting replacement work or creating a persistent session authority.

## Boundary

### Included

- Version 1 handoff/evidence input validation.
- Pure deterministic `ready`, `blocked`, or `unknown` evaluation.
- Source freshness and stable reason codes.
- Separate Linear lifecycle and GitHub implementation evidence.
- Local-checkout and Codex-managed-worktree branch-form rules.
- Fixed read-only local `git` and `gh` evidence collectors.
- Standard-input CLI with no repository handoff file.
- Focused Node tests.
- SPE-3348 required-validator registration and selection tests.
- Canonical handoff documentation.

### Excluded

- SPE-3338 queue projection or SPE-3339 next-work selection.
- SPE-3493 evidence indexing.
- Persistent locks, leases, reservations, schedulers, or session databases.
- Linear writes, issue creation, approvals, or lifecycle mutation by the preflight.
- Branch/commit/push/PR creation, closing, review, or merge commands.
- GameState, campaign persistence, week-close, reports, or player UI.
- Slice B `.codex` environment/actions, GitHub Copilot profile changes, `.agents/skills`, and `.worktreeinclude`.

## Implementation surfaces

- `scripts/session-preflight-core.mjs`
- `scripts/session-preflight.mjs`
- `scripts/session-preflight.test.mjs`
- `scripts/validation/session-preflight-selection.check.mjs`
- `scripts/validation/validators.v1.json`
- `package.json`
- `docs/session-preflight.md`
- `docs/agent-session-handoff.md`
- this slice record and the existing backlog handoff projection

## Readiness rules

- `start` is blocked by any open pull request under the current one-active-slice policy.
- `resume` requires exactly one open PR with verified issue, head branch, and `main` base matching the handoff.
- Ambiguous PR ownership, stale or unavailable required evidence, source disagreement, and lifecycle/implementation contradiction return `unknown`.
- A local start requires clean synchronized `main` at the expected base.
- A Codex managed-worktree start may use detached HEAD only when clean and exactly at the expected base.
- `blocked` and `unknown` both prohibit substantive implementation.

## Test matrix

Focused coverage includes:

- clean synchronized local start;
- matching same-issue resume;
- same, unrelated, and multiple open-PR conflicts;
- unverifiable PR ownership;
- dirty worktree and local-main divergence;
- valid and mismatched Codex detached worktrees;
- unavailable, stale, malformed, and contradictory evidence;
- completed/canceled lifecycle and changed blockers/dependencies;
- Linear versus merged/current-main evidence disagreement;
- merged evidence with unavailable Linear evidence, without an invented lifecycle conflict;
- shared CP-core/Academy contract behavior;
- fixed read-only Git and GitHub command sets;
- deterministic locale-independent reason ordering;
- fail-closed handling of empty remote-main output and valid-but-non-array PR JSON;
- deterministic SPE-3348 validator selection.

## Validation

Current direct evidence:

- Node 22 focused preflight suite: **21/21 passed** after SHA, issue-ID, argument-parser, timestamp, PR-ownership, ordering, malformed-collection, empty-remote, and unavailable-lifecycle hardening.
- Full-diff audit caught and corrected a malformed duplicate manifest entry before review.
- Amazon Q review findings for lifecycle evidence, remote-main collection, regex reuse, and validation sorting were addressed with focused regressions.
- Hosted exact-head requirements, lint, formatting, backlog-handoff, and independent review remain merge gates.

Run, at minimum:

- `npm run verify:session-preflight`
- `npm run verify:requirements:test`
- `npm run verify:requirements -- --base origin/main`
- `npm run verify:backlog-handoff`
- `npm run lint`
- truthful formatting checks and any additional selected validators
- independent full-diff review and hosted CI

## Completion and follow-up

Slice A is complete only after merge evidence and truthful Linear reconciliation. SPE-3337 remains open because Slice B and the parent’s original handoff/diagnostic acceptance remain separate obligations. Slice B must begin in a new implementation session after Slice A merges and the clean-main/open-PR gate passes.
