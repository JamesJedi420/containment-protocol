# Cursor User Rules snippet (paste into Settings → Rules)

Copy the standing-workflow block below into **Cursor → Settings → Rules → User Rules** so every new agent (local or cloud) gets the same workflow. Repo-specific detail stays in `AGENTS.md` and `docs/agent-session-handoff.md`.

1. **Standing workflow** — this file
2. **Implementation lite** — `docs/cursor-implementation-lite-user-rules-snippet.md`
3. **Pre-ship audit** — `docs/cursor-pre-ship-audit-user-rules-snippet.md`
4. **Session closeout** — `docs/cursor-session-closeout-user-rules-snippet.md`
5. **Backlog hygiene** — on demand only: `docs/cursor-backlog-hygiene-user-rules-snippet.md`
6. **Cloud-agent Linear handoff** — `docs/cursor-cloud-agent-linear-handoff-user-rules-snippet.md`

---

## Containment Protocol — standing workflow

- **Scope authority:** Linear is authoritative for **already-approved** planning/lifecycle state; GitHub code/PR/CI/tests are implementation evidence. Newly discovered durable scope is not automatically backlog scope.
- **Scope mutation:** do not create a new issue, child, parent, contradiction issue, relationship, reparenting, or expanded durable scope from implementation, harvest, deferred-work notes, review, or closeout. New/changed scope goes through Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4.
- **Unowned review/docs work:** may proceed read-only without a Linear mutation. Do not invent an issue just to satisfy bookkeeping. If durable product scope is discovered, record it as candidate input.
- **Implementation slices:** use the already-approved Linear issue named by the task. Follow the repo `implementation-lite` ship loop (commit → push → PR → independent review + external-comment triage + CI → merge → sync `main`) unless the user explicitly says no commit/PR/push/merge or local/plan only.
- **Linear lifecycle:** keep approved owned work current with truthful progress/PR/status/closure evidence. Done only when the full existing boundary is satisfied; parent closure is evaluated separately.
- **Harvest triage:** use `docs/harvest-candidate-triage-agent.md`; rich existing-owner traceability is allowed only inside an already-approved boundary. Missing boundaries stay in the canonical Linear candidate ledger until governance authorizes Phase 4.
- **Candidate ledger:** https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf
- After a PR **merges**: `git checkout main` + `git pull origin main`, then start a **new agent chat** before the next approved slice.
- During one open PR on one branch, one agent session is fine until merge.
- Each approved implementation task: give the agent the Linear issue, `planning/*-slice.md` when present, branch name, and current `main` SHA.
- Standing repo rules: read `AGENTS.md` first.
- Prefer slice docs and authoritative records over re-explaining finished work in chat.
- Live web research: prefer repo sources first; use configured read-only research tools only when current external facts are necessary; do not add search APIs to runtime without approved scope.
- Cursor plugin keep-list: `docs/agent-cursor-plugins.md`; follow dependency-scanning requirements before adding/upgrading packages.
- Session closeout: phase A while merge is blocked = no next-issue plan. Phase B after merge = plan only an already-approved next issue; otherwise report candidate/governance continuation.

---

## Optional one-line first message (approved next task)

```text
PR #____ merged. On main @ <sha>. Next approved issue: <Linear URL> — see planning/<slice>.md — branch <name>. Confirm planning/backlog.md + backlog-handoff-manifest.json match Linear (`npm run verify:backlog-handoff`).
```

If no approved next issue exists, continue candidate governance instead of using the implementation template.
