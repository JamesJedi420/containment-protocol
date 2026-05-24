# Cursor User Rules — backlog hygiene (paste into Settings → Rules)

`.cursor/rules/` is **gitignored** in this repo (per-developer). For portability across machines and cloud agents, paste the block below into **Cursor → Settings → Rules → User Rules**.

Optional: also save as `.cursor/rules/backlog-hygiene.mdc` locally (with `alwaysApply: false` in frontmatter) if you use project rules on this machine.

Repo copy of this file: `docs/cursor-backlog-hygiene-user-rules-snippet.md` (committed).

---

## Containment Protocol — backlog hygiene

Apply when I ask for backlog hygiene, Linear grooming, issue reconciliation, or GitHub mirror alignment. **Do not** use for implementation slices (read `AGENTS.md` for implementation).

**Hard boundaries:** No application code edits; no branch/PR; no new issues unless a clear durable boundary is missing; no status/label/milestone/parent/duplicate/description changes without evidence. When unsure, report **`needs owner decision`**.

**Source of truth:** Linear SPE IDs are canonical; GitHub numbers are mirrors; PRs are evidence; parents = umbrellas, children = slices; Done = current boundary satisfied.

**Before any change:** Read full Linear issue (body, comments, relations, mirrors, PRs); read linked GitHub issue/PR; classify (active / parent / docs-only / contradiction-check / duplicate / canceled / source-routing / container).

**Issue bodies:** Goal, Scope, Constraints, checkable Acceptance criteria (not only tests). Normalize `\n` / `Goal:<br>` corruption without changing meaning.

**Status:** Done only when boundary satisfied; parents stay open for partial child shipping; merged PR → reconcile Done or progress comment; do not reopen Done without plain false completion.

**Parents/children:** Shipped-slice ledger on parents; SPE IDs in lists; Linear blockers for sequencing (not prose-only deps).

**Duplicates/canceled:** Canonical target + preserved substance; clear assignee/priority on non-actionable issues.

**Mirrors/PRs:** Mirrors cite SPE or are historical; close mirrors when Linear Done; PRs name slice issues; docs-only PR does not close implementation slices.

**Safe order:** Body → status → relations → labels → milestone → blockers → comment → GitHub mirror → project docs.

**Mandatory final report:** inspected | changed | unchanged | owner decisions | mirror changes | PR traceability | docs changed | new risks | whether scope was exhaustive (disclose tool limits).

**Pointers:** `planning/backlog.md`, `AGENTS.md`, SPE-1705 doc routing, `planning/harvest-reconciliation-index.md`.
