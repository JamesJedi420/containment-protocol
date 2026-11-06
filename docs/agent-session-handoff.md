# Agent session handoff

Read [the Agent Operating Manual](agent-operating-manual.md) for the shared standing procedure. This page routes continuity evidence to the correct format; it grants no authority.

## Authority boundary

See manual §1 and [Cursor autonomous authority](cursor-autonomous-authority.md). A handoff does not supply missing approval or expand an issue. Linear owns approved scope/lifecycle; repository and GitHub evidence do not approve scope.

## Executable start/resume preflight

Before substantive implementation of an explicitly named approved boundary, use the [SPE-3337 session preflight](session-preflight.md). It evaluates source-attributed Linear, GitHub, and Git evidence and returns `ready`, `blocked`, or `unknown`.

Both `blocked` and `unknown` prohibit implementation. The preflight is read-only: it does not choose another issue, change lifecycle, reserve work, create a branch, or mutate a pull request. Local checkouts and Codex managed worktrees use separate branch-form checks while preserving the same current-base and one-active-slice policy.

A `ready` result does not itself move the issue In Progress. The authorized implementation agent performs the existing lifecycle action separately after the gate passes.

## Read-only session closeout

Use [the read-only template](read-only-session-handoff.md) only when no Linear, repository, or external writes occurred. Distinguish preliminary findings, pending durable transport, and verified canonical application.

## Standing policy

Manual §§1–6 centralize the procedure. Tracked Cursor rules retain their loading behavior; [User Rules](cursor-user-rules-snippet.md) direct pasted sessions to the same source. Linear and the slice doc carry active task details.

## After a PR merges

Follow manual §4: sync main, post truthful existing-boundary evidence, and complete merge closeout and required post-merge checkpoints. Related approved work may then continue in the same chat after the fresh checks in manual §2. Use that section's context criteria to decide when a new chat is needed; each implementation does not automatically require one. Full slice acceptance and parent completion are separate. Preserve the required gameplay-evidence follow-through in `AGENTS.md` across any handoff.

## During an open PR

Continue implementation, review fixes, and CI on the same active boundary. Use phase A if merge is blocked; do not start unrelated scope. A `resume` preflight is ready only when the sole open PR has a verified issue and branch matching the named handoff.

## Cloud / move to local

Verify current refs before checkout (manual §2). Use [the cloud-agent payload](cloud-agent-linear-handoff.md) only after an approved implementation is complete and merged and Linear was not updated. For authorized docs-only pending traceability, follow manual §4’s exact issue/evidence/operation/posting-state/next-step record; never claim it is posted.

## Each new implementation task

Use manual §§1–3 to verify actor authority, current issue/parent/children, clean main, pre-coding summary, lifecycle state, and validation boundary, whether continuing this chat or starting another. Preserve unrelated changes and worktrees. Run the session preflight before creating the implementation branch or changing lifecycle state. State the next authorized boundary explicitly; retained conversation context is not current-state evidence or permission to expand scope.

## Session closeout

Use [the phase A/B templates](agent-session-closeout.md). Carry the manual §4 implementation-handoff minimum: authorization, issue/parent, acceptance, slice, branch/base, PR/merge, validation, blockers, deferrals/candidates, actual/pending Linear writes, and next legal action.
