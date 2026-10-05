# Cloud-agent Linear handoff (local agent apply)

Cloud Agents, background agents, and other remote sessions often cannot authenticate Linear MCP
(`needsAuth`). GitHub PR linkbacks do **not** close Linear.

**Trigger (only this):** a Cloud Agent implemented an **already-approved plan** to completion and
merged that implementation PR, but could not update Linear in-session. Then emit a copy-paste
**local-agent Linear handoff** so a local Cursor agent with Linear MCP `ready` can apply only the
truthful lifecycle/evidence updates for those already-approved issues.

This handoff never authorizes issue creation, scope expansion, reparenting, new relationships, or
other candidate-derived backlog mutation. Newly discovered durable scope remains candidate input for
Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4.

Do **not** emit this handoff for planning-only PRs, open PRs, harvest-only sessions, unowned read-only
review/docs work, ambiguous approval state, or mid-slice work. If Linear MCP is `ready` in the Cloud
Agent session, update the approved issues directly and write **Posted in-session** on the same block
for verification.

Tracked rule: `.cursor/rules/cloud-agent-linear-handoff.mdc` (`alwaysApply: true`). Linear
lifecycle remains `.cursor/rules/linear-always-update.mdc`.

## When this applies

Emit **once**, after `git checkout main` && `git pull origin main` for the merged approved implementation
PR, when Linear was not updated in-session (`needsAuth`, empty-tools, or failed).

Do not emit when:

- the PR is still open (phase A);
- the merge is planning-only / docs-only and does not satisfy an approved slice acceptance bar;
- harvest or triage with no approved implementation merge;
- the implementation boundary was not already approved;
- Linear was already posted in-session (write **Posted in-session** plus the same verbatim text).

## Where to write it (same session, after merge)

Write the payload in **phase B closeout**. Optionally paste the same text into a comment on the
**already-merged** GitHub PR if the UI still accepts comments.

Do **not** edit the tracked `planning/*-slice.md` after checkout of `main`. That would be an
uncommitted post-merge change and must not open a second PR just to store the handoff.

Chat-only closeout without the phase B **Local-agent Linear handoff** fields is not enough when this
approved-implementation trigger applies.

## Required fields

| Field | Rule |
| --- | --- |
| **Issues** | Already-approved slice SPE-#### plus approved parent if relevant; links |
| **Status** | Slice **Done** only when full approved child acceptance shipped. For the parent, preserve the truthful current status unless the full parent boundary independently proves a change; use **do not change** when the handoff has no authority to move it. |
| **Comments** | Full markdown to paste: PR URL, what shipped, validation; lifecycle/evidence only |
| **PR** | Merged PR URL |
| **Do not** | Issue creation; new scope; relationship/reparenting changes; parent close without full evidence |
| **Already posted** | `yes` / `no` / `needsAuth` |

## Template (paste)

```markdown
## Local-agent Linear handoff

Linear MCP: needsAuth | ready | failed
Approval basis: <already-approved SPE/slice reference>
Already posted in this session: no

### SPE-____ (approved slice)
- Status: Done | <truthful current status> | **do not change**
- Comment:

<verbatim markdown: merged PR URL, what shipped, validation>

### SPE-____ (approved parent, if relevant)
- Status: <truthful current status> | Done | **do not change**
- Comment: <verbatim lifecycle/evidence note or **none**>

### Candidate evidence discovered during work
- <candidate-ledger reference or **none**; never create/expand scope from this handoff>

### Do not
- create issues/children/parents/relationships
- expand approved scope
- change parent status without independent evidence for the full parent boundary
```

## Local agent apply

1. Authenticate Linear MCP in Cursor desktop if `needsAuth`.
2. Verify the named slice/plan was already approved and the PR merged.
3. Apply the lifecycle/evidence payload **verbatim**; do not rewrite tone or drop mechanic/boundary.
4. Skip a comment already present with the same PR URL and the same facts.
5. Preserve the parent's truthful current state unless the handoff contains full approved evidence for a change.
6. Do not convert candidate evidence into issue scope. Route it through the normal approval phases.
7. Honor **do not change** and **Do not** rows, then stop.

## Do not

- Invent Linear API tokens or wire Linear into `src/` / CI.
- Treat the GitHub PR description as Linear closure.
- Emit this handoff on planning PRs, before merge, or for unapproved/ambiguous work.
- Collapse the comment into a one-line “merged” note.
- Use this handoff as a back door for candidate-derived backlog mutation.
