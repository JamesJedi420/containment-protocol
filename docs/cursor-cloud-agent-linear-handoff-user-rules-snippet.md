# Cursor User Rules — cloud-agent Linear handoff (paste block)

Paste into **Cursor → Settings → Rules → User Rules**. Full detail: `docs/cloud-agent-linear-handoff.md`. Tracked rule: `.cursor/rules/cloud-agent-linear-handoff.mdc`.

---

Whenever a **Cloud Agent** (or background/remote agent) **implements a plan** (planning PR or runtime PR), it must provide an **agent hand-off for a local agent to update Linear**.

Linear MCP is often `needsAuth` in Cloud Agent VMs. GitHub PR linkbacks do not close Linear.

The Cloud Agent writes the same copy-paste payload in (1) the slice doc `## Local-agent Linear handoff`, (2) the PR Follow-ups, and (3) session closeout. Payload: issue IDs, exact status or **do not change**, verbatim comment markdown, parent row, **Do not** list, PR URL.

A **local** agent with Linear MCP `ready` applies that block verbatim, skips duplicates, and honors **do not change**. Do not invent tokens or skip Linear because GitHub already has a bot comment.
