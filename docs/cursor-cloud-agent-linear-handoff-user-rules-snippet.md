# Cursor User Rules — cloud-agent Linear handoff (paste block)

Paste into **Cursor → Settings → Rules → User Rules**. Full detail: `docs/cloud-agent-linear-handoff.md`. Tracked rule: `.cursor/rules/cloud-agent-linear-handoff.mdc`.

---

A **Cloud Agent** (or background/remote agent) must provide an **agent hand-off for a local agent to update Linear** only after it implements an **already-approved plan** to completion and merges that PR, and could not update Linear in-session.

Do not emit the handoff for planning-only PRs, open PRs, harvest-only work, unowned read-only review/docs work, or any implementation whose approval state is absent/ambiguous. Linear MCP is often `needsAuth` in Cloud Agent VMs; GitHub PR linkbacks do not close Linear.

After the approved implementation merge, write the copy-paste payload in phase B closeout (not a post-merge edit of the tracked slice doc on `main`): approved issue IDs, slice **Done** only when the full approved boundary shipped, parent truthful current status (or **do not change**) unless full parent completion is independently proven, verbatim lifecycle/evidence comment (PR URL + what shipped + validation), and any candidate-evidence reference.

This handoff never authorizes issue creation, child/parent creation, new relationships, reparenting, or scope expansion. Newly discovered durable scope remains candidate input for Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4.

A **local** agent with Linear MCP `ready` verifies the approval basis, applies the lifecycle/evidence block verbatim, preserves truthful parent state, skips duplicates, and does not convert candidate evidence into backlog scope.
