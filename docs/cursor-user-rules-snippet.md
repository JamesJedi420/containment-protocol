# Cursor User Rules snippet (paste into Settings → Rules)

Copy the standing-workflow block below into **Cursor → Settings → Rules → User Rules** so every new agent (local or cloud) gets the same workflow. Repo-specific detail stays in `AGENTS.md` and `docs/agent-session-handoff.md`.

1. **Standing workflow** — this file
2. **Implementation lite** — `docs/cursor-implementation-lite-user-rules-snippet.md`
3. **Pre-ship audit** — `docs/cursor-pre-ship-audit-user-rules-snippet.md`
4. **Session closeout** — `docs/cursor-session-closeout-user-rules-snippet.md`
5. **Backlog hygiene** — on demand only: `docs/cursor-backlog-hygiene-user-rules-snippet.md`
6. **Cloud-agent Linear handoff** — `docs/cursor-cloud-agent-linear-handoff-user-rules-snippet.md`
7. **Cursor autonomous authority** — `docs/cursor-autonomous-authority.md` (canonical; also alwaysApply rule)

---

## Containment Protocol — standing workflow

- **Cursor authority:** Cursor is an autonomous implementation and engineering-management agent. It may reconcile, create, reparent, and close Linear issues under `docs/cursor-autonomous-authority.md` safeguards. ChatGPT Phase 1–4 gates do **not** bind Cursor. Codex designations are preferences, not exclusive locks.
- **Scope authority:** Linear is the system of record; GitHub is implementation evidence.
- **Lifecycle:** keep owned work current with truthful progress/PR/status/closure evidence. Done only when the full boundary is satisfied; parent closure is separate.
- **Implementation slices:** follow the repo `implementation-lite` ship loop (commit → push → PR → independent review + external-comment triage + CI → merge → sync `main`) unless the user explicitly says no commit/PR/push/merge or local/plan only.
- **Safeguards:** inspect existing Linear first; prefer fold-in; keep issues bounded with Goal/Scope/Constraints/Acceptance; one canonical shared-system owner; no parallel frameworks or speculative drive-bys; escalate only real blockers.
- After a PR **merges**: `git checkout main` + `git pull origin main`, then prefer a **new agent chat** for the next slice.
- During one open PR on one branch, one agent session is fine until merge.
- Standing repo rules: read `AGENTS.md` first; Cursor alwaysApply rule `.cursor/rules/cursor-autonomous-authority.mdc`.
- Prefer slice docs and Linear over re-explaining finished work in chat.
- Cursor plugin keep-list: `docs/agent-cursor-plugins.md`; Sonatype before npm add/upgrade.
- Session closeout: phase A while merge blocked; phase B after merge may plan/select/create the next bounded slice when continuation is expected.
