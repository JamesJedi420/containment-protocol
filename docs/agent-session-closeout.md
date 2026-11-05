# Agent session closeout (implementation)

The shared procedure lives in [Agent Operating Manual §4](agent-operating-manual.md#4-ship-review-update-linear-and-close-out). This page retains the response formats. Tracked loader: [implementation-lite](../.cursor/rules/implementation-lite.mdc).

## Session order (mandatory)

Pre-ship audit → commit/push/PR → independent review and CI → merge → sync main → truthful Linear evidence → phase B. Phase A is an interim blocked/open-PR report. Follow the gameplay-evidence continuation exception in `AGENTS.md` for necessary work on the originally authorized feature; otherwise no next-issue implementation or candidate reconciliation in merge closeout. Later Cursor continuation retains its canonical autonomous authority.

## Deferred work recording (mandatory)

Use manual §§1, 3–5: record in-boundary deferrals on the slice and existing owner; new boundaries follow the actor’s candidate/authority route. Closeout must match those durable records. No invented issue or silent parent closure to populate a handoff.

## Final response format (mandatory)

Return **only** the structure for the current phase (no extra sections, no preamble).

### Phase A — PR open, babysit blocked (interim only)

Use when the slice is committed, pushed, PR is open, and babysit/merge cannot finish in-session (external blocker or explicit **do not merge**).

```text
Current issue status:
- Partially complete (PR open) / blocked / …

Changes made:
- concise list of changed files and what changed

Audit passes:
- scope and integration:
- edge cases:
- determinism and state:
- regression:
- documentation:
- cleanup:

Validation:
- command:
- result:

Remaining risks or deferred work:
- approved in-boundary deferral(s): … / none
- new candidate scope deliberately not created: … / none

PR:
- URL:

Local-agent Linear handoff:
- none (handoff fires only after an implementation PR merges; see docs/cloud-agent-linear-handoff.md)

Next issue implementation plan:
- Deferred until after merge (phase B). Do not fill this section when the PR is only open.
```

### Phase B — After merge

Use when the PR is **merged**, the agent has run **`git checkout main` && `git pull origin main`**, and backlog handoff updates are **on `main`** (`npm run verify:backlog-handoff` passes when applicable). The Linear merge comment may still be **pending** when Linear MCP was unavailable — fill **Local-agent Linear handoff** (`docs/cloud-agent-linear-handoff.md`) only when its approved-implementation trigger applies. Authorized docs-only merges use the factual pending/unverified closeout in `docs/agent-session-handoff.md`. Do not block phase B on Linear tooling availability.

```text
Merge closeout:
- PR URL:
- What shipped (one line):
- Parent issue status (open / done):

Local-agent Linear handoff:
- none — unless this merge completed an implementation plan and Linear was not updated (docs/cloud-agent-linear-handoff.md)
- Linear MCP / already posted / issues / status / verbatim comments / Do not: (fill only on that trigger)

Next issue implementation plan:
- Issue: <next Linear issue or “none”>
- Boundary:
- Files to inspect:
- Existing systems to reuse:
- Risks and edge cases:
- Tests:
- Docs:
- What not to change:
- Implementation sequence:

Waiting for the next slice:
- <Linear issue URL, slice doc, and branch, or “none — Cursor may select/create under docs/cursor-autonomous-authority.md when continuation is requested”>

Handoff:
- Agent already synced main in-session; prefer a new agent chat with Linear URL, slice doc, branch name, main SHA, except for the same-run gameplay-evidence continuation in `AGENTS.md`. Cursor may continue under autonomous authority when the user requests continuation.
```

Fill every subsection for the active phase. Use `none` only when truly empty. **Phase A:** **Audit passes** summarize the six pre-ship passes from `docs/agent-pre-ship-audit.md`. **Phase B:** report actual merge evidence and only an already-approved next-issue plan, if one exists. ChatGPT Phase gates do not bind Cursor (`docs/cursor-autonomous-authority.md`). **Local-agent Linear handoff** is required only after an implementation plan is complete and that PR is merged, when Linear was not updated in-session (`docs/cloud-agent-linear-handoff.md`).

Read [Hermes shipping checkpoints](hermes-shipping-checkpoints.md) for local-model evidence delegation during the authorized ship loop, including pre-ship and post-merge curation. Record direct checks or bounded fallback where applicable; retain the existing actor-specific authority and closeout triggers.
