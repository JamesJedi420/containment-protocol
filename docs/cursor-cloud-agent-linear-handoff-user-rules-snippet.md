# Cursor User Rules — cloud-agent Linear handoff (paste block)

Paste into **Cursor → Settings → Rules → User Rules**. Full detail: `docs/cloud-agent-linear-handoff.md`. Tracked rule: `.cursor/rules/cloud-agent-linear-handoff.mdc`.

---

A **Cloud Agent** (or background/remote agent) must provide an **agent hand-off for a local agent to update Linear** only after it **implements a plan to completion and merges that PR**.

Do not emit the handoff for planning-only PRs, open PRs, or harvest-only work. Linear MCP is often `needsAuth` in Cloud Agent VMs; GitHub PR linkbacks do not close Linear.

After the implementation merge, write the copy-paste payload in the slice doc `## Local-agent Linear handoff` and phase B closeout: issue IDs, slice **Done**, parent Backlog unless the parent shipped, verbatim comment (PR URL + what shipped + validation).

A **local** agent with Linear MCP `ready` applies that block verbatim and skips duplicates.
