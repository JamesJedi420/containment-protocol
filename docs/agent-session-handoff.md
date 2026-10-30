# Agent session handoff

Canonical standing policy for humans and agents. User Rules are pasted from `docs/cursor-user-rules-snippet.md`; repo behavior is summarized in `AGENTS.md` and tracked `.cursor/rules/*.mdc` files.

Cursor backlog authority: **`docs/cursor-autonomous-authority.md`**.

## Authority boundary

A handoff may continue an active Linear issue and may apply truthful lifecycle/evidence updates (status, PR links, progress/closure comments, factual notes).

**Cursor** may also create, fold, reparent, or expand Linear scope when durable work is discovered, under autonomous-authority safeguards. ChatGPT Phases 1–4 do **not** gate Cursor.

**ChatGPT** actors still use Phases 1–4 for backlog-shape mutations per ChatGPT Project / candidate-ledger workflow.

See `docs/governance/authority-contract.v1.json` (`lifecycle-evidence` vs `backlog-shape`; CP-GOV-009).

## Read-only session closeout

For sessions that only review evidence, analyze documentation, or triage harvest candidates (without Linear, repository, or external writes), use [Read-only session handoff](./read-only-session-handoff.md). Record inspected issues, evidence and candidate/approval state, the canonical ledger reference when available, and the next authorized actor/action. This is not an implementation closeout and does not trigger the post-merge cloud-agent Linear handoff or grant new mutation authority.

## Standing policy

| Layer | What belongs there |
| --- | --- |
| **Cursor User Rules** | Merge → sync `main` → new agent for next slice. |
| **`AGENTS.md` + tracked `.cursor/rules/*`** | Repo-wide implementation, Linear lifecycle, review, Cursor autonomy. |
| **Linear + `planning/*-slice.md` + first message** | Active implementation task: issue link, slice doc, branch, `main` SHA. |
| **Candidate ledger (ChatGPT)** | ChatGPT reconciliation workflow; not a Cursor stop-gate. |

## After a PR merges

1. `git checkout main` and `git pull origin main`.
2. Start a new agent chat before another implementation slice (recommended for context hygiene).
3. First message may name the next Linear issue, or ask Cursor to continue / pick / create the next bounded slice under autonomous authority.

## During an open PR

One agent session on the same branch may implement, review, fix CI, and merge the **same active boundary**. Start a new session when the task changes or after merge.

## Cloud / move to local

- Verify the branch/ref before checkout; use current `main` if an old migrated branch was deleted.
- After a Cloud Agent implements a plan to completion and merges that PR, leave the local-agent Linear handoff in `docs/cloud-agent-linear-handoff.md` if Linear was not updated in-session.
- Planning-only/open-PR sessions do not trigger that lifecycle handoff.
- If an **authorized docs-only** merge leaves legitimate existing-boundary Linear traceability unposted, record **pending / not posted** in normal docs-work closeout: exact issue target, merged PR/validation, intended factual operation, posting state, and next authorized verification/posting step. Do not claim an applied update or invoke the implementation-only cloud-agent handoff. Unowned read-only analysis requires no Linear write.

## Each new implementation task

1. Start from an existing Linear issue or create a bounded one when justified.
2. Read `planning/<topic>-slice.md` when present.
3. Read parent/relevant children and linked evidence.
4. Set the slice **In Progress** when implementation begins.
5. Follow `.cursor/rules/implementation-lite.mdc`: pre-coding summary → implementation → pre-ship audit → commit/push/PR → review/CI → merge → lifecycle update.
6. Deferred in-boundary work → slice doc + owner comment. New durable boundary → Cursor Linear create/fold under safeguards.

## Session closeout

**Phase A — PR open / merge blocked:** report blocker, PR URL, CI status. Do not code another unrelated issue in the same PR.

**Phase B — after merge:** complete current-slice evidence and closeout; plan an already-approved next issue if identified, otherwise stop. Next-slice selection, candidate reconciliation, scope decisions, and implementation belong in a **new agent session**. Cursor retains autonomous authority in that new session; ChatGPT follows its own Phase 1–4 gates. This is a session-timing rule, not a general restriction on Cursor.

Use `docs/agent-session-closeout.md` for response structures.
