---
name: cp-next-implementation-slice
description: >-
  Selects the next already-approved Containment Protocol Linear issue when
  nothing is In Progress, sets that issue In Progress, and starts the
  implementation slice. Use when the backlog handoff says In progress is none,
  no slice was named, or the user asks what to work on next. Does not reconcile
  candidates or create issues.
---

# Next implementation slice

Pick one already-approved SPE issue and start it. Candidate reconciliation belongs to ChatGPT. Do not run `cp-candidate-triage-linear`.

## When to run

Obey `.cursor/rules/clean-main-before-next-slice.mdc` first. If `main` is dirty or any PR is open, babysit and merge that PR, then sync `main`. Do not pick or start a slice until `main` is clean and no PR is open.

Run this picker only when no implementation slice is already in progress and the user did not name an issue.

If the user named a Linear issue, implement that issue after `main` is clean. Do not override it with this picker.

## Confirm the queue is empty

Read `planning/backlog-handoff-manifest.json` (`primary`, `inProgress`, `recentlyShipped`) and the **In progress** line in `planning/backlog.md`.

With Linear MCP `list_issues`, team that owns SPE issues, `state` `In Progress`. Discover the team from `get_issue` on `primary` if needed.

- Manifest `inProgress` is non-empty, or Linear has an In Progress slice: resume that issue. Do not pick a second one. If more than one In Progress slice exists, stop and ask which to resume.
- Otherwise the queue is empty. Continue below.

## Eligible issue

An issue is eligible only when all of these are true:

- It already exists. Status is Backlog or Todo.
- It is not listed in `recentlyShipped`.
- It is a slice, not a parent umbrella. A parent with child issues is not eligible.
- `get_issue` shows acceptance criteria a single slice can satisfy.
- No `blockedBy` issue is still open. Done and Canceled blockers do not block.
- A `planning/*-slice.md` for that SPE id exists, or the issue body already names the branch and the acceptance bar.

Skip Done, Canceled, duplicate, harvest-only, and contradiction-only issues that do not change the game.

## Choose one

Apply in order. Stop at the first eligible issue.

1. The next concrete SPE id named in `planning/backlog.md` **Recommended next step** that is not the `primary` parent and is not recently shipped.
2. An eligible child of `primary` (`list_issues` with `parentId` set to the primary id). Prefer a child that already has a slice doc. If several remain, prefer the higher Linear priority, then the lowest SPE number.
3. The next other eligible child slice named in the active queue of `planning/backlog.md`.

Do not select the `primary` parent itself.

If no eligible issue remains, stop. Ask for a Linear issue URL, slice doc, and branch. Do not create an issue, edit the candidate ledger, or start a governance phase.

## Start work

When exactly one issue wins:

1. Read the issue, its comments, its parent, and the slice doc.
2. `save_issue` with `id` and `state` `In Progress` only. Do not change the description, parent, or relations.
3. From current `main`, create the branch named in the slice doc, otherwise the issue `gitBranchName`.
4. Implement that slice under `.cursor/rules/implementation-lite.mdc`, including the ship loop.

Report this before the first code edit:

```markdown
## Next slice
- Issue: SPE-____ — url
- Why: <which rule above matched>
- Skipped: <nearer issues and why>
- Slice doc: planning/....md
- Branch: <name>
```

## Do not

- Create a Linear issue, child, or parent.
- Mark a parent Done.
- Reorder `planning/backlog.md` to justify the pick.
- Start coding when two issues still tie after the rules above.
