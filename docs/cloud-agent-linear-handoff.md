# Cloud-agent Linear handoff (local agent apply)

Cloud Agents, background agents, and other remote sessions often cannot authenticate Linear MCP
(`needsAuth`). GitHub PR linkbacks do **not** close Linear. When a Cloud Agent authors or implements
a plan (planning PR or runtime PR), it **must** emit a copy-paste **local-agent Linear handoff** so
a local Cursor agent with Linear MCP `ready` can apply the exact comments and status changes.

Tracked rule: `.cursor/rules/cloud-agent-linear-handoff.mdc` (`alwaysApply: true`). Linear
lifecycle remains `.cursor/rules/linear-always-update.mdc`.

## When this applies

Emit the handoff after commit + PR open whenever **any** of these is true:

- the session is a Cloud Agent / background agent / remote VM;
- Linear MCP is `needsAuth`, empty-tools, or failed;
- the user forbade a status change (for example **do not set In Progress**) and the Cloud Agent
  could not post the allowed comments.

Local agents that already posted the same comments in-session still write the handoff block with
**Posted in-session** so a later agent can verify instead of inventing a second comment.

## Where to write it (same session)

Write the same payload in all three:

1. Active `planning/*-slice.md` section `## Local-agent Linear handoff`
2. PR body **Follow-ups** (verbatim comments; fill PR URL)
3. Session closeout **Local-agent Linear handoff** (`docs/agent-session-closeout.md` phase A or B)

Chat-only closeout text is not enough.

## Required fields

| Field | Rule |
| --- | --- |
| **Issues** | Slice SPE-#### plus parent if any; links |
| **Status** | Exact target (Backlog / In Progress / Done) **or** explicit **do not change** |
| **Comments** | Full markdown to paste; not a one-liner summary of intent |
| **PR** | URL once open; placeholder `PR URL` until then, then rewrite |
| **Do not** | Status moves, parent close, harvest one-liners, or other forbidden actions |
| **Already posted** | `yes` / `no` / `needsAuth` |

## Template (paste)

```markdown
## Local-agent Linear handoff

Linear MCP: needsAuth | ready | failed
Already posted in this session: no

### SPE-____ (slice)
- Status: <Backlog | In Progress | Done | **do not change**>
- Comment:

<verbatim markdown>

### SPE-____ (parent, if any)
- Status: <Backlog | In Progress | Done | **do not change**>
- Comment: <verbatim or **none**>

### Do not
- <forbidden status moves and extra issues>
```

## Local agent apply

1. Authenticate Linear MCP in Cursor desktop if `needsAuth`.
2. Apply **verbatim**; do not rewrite tone or drop mechanic/boundary.
3. Skip a comment already present with the same PR URL and the same facts.
4. Honor **do not change** and **Do not** rows even if standing Linear rules would otherwise move
   status (explicit user/session constraints win for that issue).
5. After posting, comment on the GitHub PR that Linear was applied (optional) and stop.

## Do not

- Invent Linear API tokens or wire Linear into `src/` / CI.
- Treat the GitHub PR description as Linear closure.
- Set **In Progress** or **Done** when the handoff says **do not change**.
- Collapse the comment into a one-line “planning done” note.
