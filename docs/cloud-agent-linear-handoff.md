# Cloud-agent Linear handoff (local agent apply)

Cloud Agents, background agents, and other remote sessions often cannot authenticate Linear MCP
(`needsAuth`). GitHub PR linkbacks do **not** close Linear.

**Trigger (only this):** a Cloud Agent **implemented a plan to completion** and **merged** that
implementation PR. Then emit a copy-paste **local-agent Linear handoff** so a local Cursor agent
with Linear MCP `ready` can set slice **Done**, comment PR URL + what shipped, and leave the parent
Backlog unless the full parent shipped.

Do **not** emit this handoff for planning-only PRs, open PRs, harvest-only sessions, or mid-slice
work. If Linear MCP is `ready` in the Cloud Agent session, update Linear directly and write
**Posted in-session** on the same block for verification.

Tracked rule: `.cursor/rules/cloud-agent-linear-handoff.mdc` (`alwaysApply: true`). Linear
lifecycle remains `.cursor/rules/linear-always-update.mdc`.

## When this applies

Emit **once**, after `git checkout main` && `git pull origin main` for the merged implementation PR,
when Linear was not updated in-session (`needsAuth`, empty-tools, or failed).

Do not emit when:

- the PR is still open (phase A);
- the merge is planning-only / docs-only and does not satisfy the slice acceptance bar;
- harvest or triage with no implementation merge;
- Linear was already posted in-session (write **Posted in-session** plus the same verbatim text).

## Where to write it (same session, after merge)

Write the payload in **phase B closeout**. Optionally paste the same text into a comment on the
**already-merged** GitHub PR if the UI still accepts comments.

Do **not** edit the tracked `planning/*-slice.md` after checkout of `main`. That would be an
uncommitted post-merge change and must not open a second PR just to store the handoff.

Chat-only closeout without the phase B **Local-agent Linear handoff** fields is not enough.

## Required fields

| Field | Rule |
| --- | --- |
| **Issues** | Slice SPE-#### plus parent if any; links |
| **Status** | Slice **Done** when full child acceptance shipped; parent **Backlog** unless full parent shipped; or explicit **do not change** |
| **Comments** | Full markdown to paste: PR URL, what shipped, validation |
| **PR** | Merged PR URL |
| **Do not** | Parent close when children remain; harvest one-liners |
| **Already posted** | `yes` / `no` / `needsAuth` |

## Template (paste)

```markdown
## Local-agent Linear handoff

Linear MCP: needsAuth | ready | failed
Already posted in this session: no

### SPE-____ (slice)
- Status: Done
- Comment:

<verbatim markdown: merged PR URL, what shipped, validation>

### SPE-____ (parent, if any)
- Status: Backlog | Done | **do not change**
- Comment: <verbatim or **none**>

### Do not
- <forbidden status moves>
```

## Local agent apply

1. Authenticate Linear MCP in Cursor desktop if `needsAuth`.
2. Apply **verbatim**; do not rewrite tone or drop mechanic/boundary.
3. Skip a comment already present with the same PR URL and the same facts.
4. Honor **do not change** and **Do not** rows.
5. Stop after posting.

## Do not

- Invent Linear API tokens or wire Linear into `src/` / CI.
- Treat the GitHub PR description as Linear closure.
- Emit this handoff on planning PRs or before merge.
- Collapse the comment into a one-line “merged” note.
