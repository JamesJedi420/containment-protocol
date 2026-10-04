# Agent session handoff

Canonical standing policy for humans and agents. User Rules are pasted from `docs/cursor-user-rules-snippet.md`; repo behavior is summarized in `AGENTS.md` and tracked `.cursor/rules/*.mdc` files.

## Authority boundary

A handoff may continue an **already-approved** Linear issue and may apply truthful lifecycle/evidence updates to that boundary. It may not create a new issue, child, parent, contradiction issue, relationship, or expanded durable scope merely because follow-up work was discovered.

New or changed scope returns to the Containment Protocol governance flow:

1. Phase 1 — candidate assessment and production decomposition;
2. Phase 2 — parent reconciliation and approval;
3. Phase 3 — child/supporting-work reconciliation, mandatory contradiction review, and approval;
4. Phase 4 — approved Linear update.

If approval state is missing or ambiguous, fail closed and preserve the finding as candidate/deferred evidence.

## Standing policy

| Layer | What belongs there |
| --- | --- |
| **Cursor User Rules** | Merge → sync `main` → new agent for next already-approved slice. |
| **`AGENTS.md` + tracked `.cursor/rules/*`** | Repo-wide implementation, Linear lifecycle, review, and governance guardrails. |
| **Linear + `planning/*-slice.md` + first message** | One approved implementation task: issue link, slice doc, branch, `main` SHA. |
| **Candidate/reconciliation ledger** | Newly discovered ideas, missing boundaries, contradiction findings, provenance, and approval state until Phase 4. |

## After a PR merges

1. `git checkout main` and `git pull origin main`.
2. Start a new agent chat before another implementation slice.
3. If the next task is already approved, first message includes Linear issue URL, `planning/…-slice.md`, branch name, and current `main` SHA.
4. If no approved next issue exists, do not invent one. Return the useful follow-up as candidate input for the governance workflow.

## During an open PR

One agent session on the same branch may implement, review, fix CI, and merge the **same approved boundary**. Start a new session when the task changes or after merge.

## Cloud / move to local

- Verify the branch/ref before checkout; use current `main` if an old migrated branch was deleted.
- After a Cloud Agent implements an approved plan to completion and merges that PR, leave the local-agent Linear handoff defined in `docs/cloud-agent-linear-handoff.md` if Linear was not updated in-session.
- Planning-only/open-PR sessions do not trigger that lifecycle handoff.
- A handoff must separate legal lifecycle updates from candidate scope; it must not ask the next agent to create unapproved issue structure.

## Each new implementation task

1. Start from an already-approved Linear issue or explicitly approved workflow/docs boundary.
2. Read the relevant `planning/<topic>-slice.md` when present.
3. Read parent/relevant children and linked implementation evidence.
4. Set the approved slice **In Progress** when implementation begins.
5. Follow `.cursor/rules/implementation-lite.mdc`: pre-coding summary → implementation → pre-ship audit → commit/push/PR → review/CI → merge → lifecycle update.
6. For deferred work already inside the approved boundary, record it in the slice doc and existing owner. For a new durable boundary, record a candidate and return it to Phase 1 instead of creating a child.
7. Harvest triage follows `docs/harvest-candidate-triage-agent.md`; missing boundaries remain candidates until Phase 4.

## Session closeout

**Phase A — PR open / merge blocked:** report blocker, PR URL, CI status, and current approved issue state. Do not code or plan another issue.

**Phase B — after merge:** verify the approved slice lifecycle update, then prepare a next-issue plan only when an already-approved next issue exists. Otherwise identify the candidate/governance continuation without creating scope.

Use `docs/agent-session-closeout.md` for the detailed response structures.

## Optional first message template

For an approved next slice:

```text
PR #____ merged. On main @ <sha>. Next approved issue: <Linear URL> — see planning/<slice>.md — branch <name>.
```

For discovered but unapproved work, do not use the implementation template; route the finding through candidate governance instead.
