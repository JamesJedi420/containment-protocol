# Cursor User Rules — implementation lite (paste into Settings → Rules)

Paste this block into **Cursor → Settings → Rules → User Rules** for normal Containment Protocol implementation sessions. Tracked repo copy: `.cursor/rules/implementation-lite.mdc` (`alwaysApply: true`).

Full detail: `AGENTS.md`. Authority: `docs/cursor-autonomous-authority.md`. Pre-ship audit: `docs/cursor-pre-ship-audit-user-rules-snippet.md`. Closeout: `docs/cursor-session-closeout-user-rules-snippet.md`.

---

## Containment Protocol — Implementation Lite

### Source of truth

Linear is authoritative for scope, status, and closure. GitHub provides implementation evidence. Cursor may create/fold Linear scope under autonomous-authority safeguards; ChatGPT Phase gates do not bind Cursor.

Before coding: read the Linear issue, comments, parent/children, evidence, and slice doc. Treat Goal, Scope, Constraints, Acceptance as binding for the active boundary.

### Scope discipline

Implement the smallest coherent deterministic slice that satisfies the active issue.

Do not:
- expand the active PR past acceptance without updating Linear first;
- create parallel systems;
- rewrite unrelated code;
- fix nearby issues unless required by acceptance;
- close a parent because only one child shipped.

New durable boundaries discovered mid-work: create or fold Linear ownership under safeguards; prefer a separate PR when the diff would bloat.

### Deferred work

- In-boundary deferral: slice doc + existing owner comment.
- New durable boundary: Cursor Linear create/fold under `docs/cursor-autonomous-authority.md`.

### Ship loop

Pre-ship audit → commit → push → PR → independent review + bot triage + CI → merge → sync `main`. Do not end with only local files or an open unmerged PR unless the user says no commit / no PR / do not merge.
