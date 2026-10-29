---
name: cp-next-implementation-slice
description: >-
  Selects or creates the next Containment Protocol Linear implementation slice
  when nothing is In Progress. Use when the backlog handoff says In progress is
  none, no slice was named, or the user asks what to work on next. Cursor may
  create bounded issues under autonomous authority; ChatGPT Phase gates do not
  bind Cursor.
---

# Next implementation slice

Pick or create one Linear issue and start it. Canonical authority: `docs/cursor-autonomous-authority.md`.

## When to run

Obey `.cursor/rules/clean-main-before-next-slice.mdc` first. If `main` is dirty or any PR is open, babysit and merge, then sync `main`.

If the user named a Linear issue, implement that issue after `main` is clean.

## Confirm the queue is empty

Read `planning/backlog-handoff-manifest.json` and the **In progress** line in `planning/backlog.md`. List Linear **In Progress** SPE issues.

- If a sole In Progress slice exists: **resume it**. Do not start a second.
- If multiple In Progress: stop and ask which to resume.
- Otherwise continue.

## Choose or create

Prefer, in order:

1. Recommended next concrete SPE in `planning/backlog.md` (not the primary umbrella).
2. Eligible child of `primary` with clear acceptance; prefer higher priority, then lower SPE number.
3. Other eligible backlog children named in the active queue.
4. If no eligible existing issue fits and durable scope is justified: **create** a bounded Linear issue (Goal/Scope/Constraints/Acceptance; prefer existing parent; no duplicate owners) under autonomous-authority safeguards, then select it.

Skip Done/Canceled/duplicate/contradiction-only unless the issue itself is an approved docs/workflow boundary. Do not select SPE-1052 or any umbrella with unfinished children as the coding slice.

## Start work

1. Branch from current `main` (`gitBranchName` or slice-doc branch) **before** handoff edits.
2. `save_issue` → **In Progress**; comment rationale if newly created or newly selected.
3. Implement under `.cursor/rules/implementation-lite.mdc`.

Report before first feature edit:

```markdown
## Next slice
- Issue: SPE-____ — url
- Why: <selection or create rationale>
- Skipped: <nearer issues and why>
- Slice doc: planning/....md (create if needed)
- Branch: <name>
```

## Do not

- Mark a parent Done for a child-only ship.
- Select an umbrella as the coding slice when children own the work.
- Expand the active PR unboundedly; land new durable scope on its own issue/PR when needed.
