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

When `docs/cursor-delegated-backlog-approval.md` is **effective on `origin/main`** and the session has an **explicit** implementation-continuation request with no named slice, follow that policy (eligibility, audit evidence, prohibitions) instead of inventing a pick here. Until that gate passes, this skill only starts an already-approved eligible issue.

## When to run

Obey `.cursor/rules/clean-main-before-next-slice.mdc` first. If `main` is dirty or any PR is open, babysit and merge that PR, then sync `main`. Do not pick or start a slice until `main` is clean and no PR is open.

Run this picker only when no implementation slice is already in progress and the user did not name an issue.

If the user named a Linear issue, implement that issue after `main` is clean. Do not override it with this picker.

## Confirm the queue is empty

Read `planning/backlog-handoff-manifest.json` (`primary`, `inProgress`, `recentlyShipped`) and the **In progress** line in `planning/backlog.md`.

With Linear MCP `list_issues`, team that owns SPE issues, `state` `In Progress`. Discover the team from `get_issue` on `primary` if needed.

- Manifest `inProgress` is non-empty, or Linear has an In Progress slice: **resume that issue**. Do not pick a second one. If more than one In Progress slice exists, stop and ask which to resume.
- Otherwise the queue is empty. Continue below.

## Eligible issue

An issue is eligible only when all of these are true:

- It already exists. Status is Backlog or Todo.
- It is not listed in `recentlyShipped`.
- It is a slice, not a parent umbrella. Reject any issue that has open or remaining child issues (`list_issues` with `parentId` set to the candidate), or whose body requires implementation through children. Do not rely on description text alone.
- `get_issue` shows acceptance criteria a single slice can satisfy. A slice doc alone is not enough unless that document itself states the accepted boundary and the issue body is consistent with it.
- No `blockedBy` issue is still open. Done and Canceled blockers do not block.
- A `planning/*-slice.md` for that SPE id exists, or the issue body already names the branch and the acceptance bar.

Skip Done, Canceled, duplicate, harvest-only, and contradiction-only issues that do not change the game (exception only when the issue body itself is an explicitly approved docs/workflow boundary).

## Choose one

Apply in order. Stop at the first eligible issue.

1. The next concrete SPE id named in `planning/backlog.md` **Recommended next step** that is not the `primary` parent and is not recently shipped.
2. An eligible child of `primary` (`list_issues` with `parentId` set to the primary id). Prefer a child that already has a slice doc. If several remain, prefer the higher Linear priority, then the lowest SPE number.
3. The next other eligible child slice named in the active queue of `planning/backlog.md`.

Do not select the `primary` parent itself. Do not use JSON key insertion order in the manifest as a backlog ranking; the manifest has no ordered candidate list.

If no eligible issue remains, stop. Ask for a Linear issue URL, slice doc, and branch. Do not create an issue, edit the candidate ledger, or start a governance phase. If delegated approval is effective on `main` and this session has an explicit implementation-continuation request, continue under `docs/cursor-delegated-backlog-approval.md` instead of inventing a pick here.

## Start work

When exactly one issue wins:

1. Read the issue, its comments, its parent, and the slice doc.
2. From current `main`, create the branch named in the slice doc, otherwise the issue `gitBranchName`, **before** any repository audit or handoff edits.
3. `save_issue` with `id` and `state` `In Progress` only. Do not change the description, parent, or relations.
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
- Select SPE-1052 or any parent umbrella as the coding slice.
