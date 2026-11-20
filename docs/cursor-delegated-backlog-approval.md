# Cursor work-selection heuristics (historical delegated approval)

**Superseding policy for Cursor:** `docs/cursor-autonomous-authority.md`. Cursor may select **or create** Linear issues under those safeguards. ChatGPT Phase 1–4 gates do not bind Cursor.

This document remains as **selection heuristics** (clean main, resume In Progress, prefer non-umbrella children, audit comment shape). The former “effectiveness gate / no issue create / ChatGPT owns reconciliation” language below is **historical** for Cursor and must not be read as a stop-gate.

Tracked rule: `.cursor/rules/cursor-delegated-backlog-approval.mdc` (`alwaysApply: true`) — points at autonomous authority.

## Historical effectiveness gate (obsolete for Cursor stop/start)

Previously this policy required presence on `origin/main`, matching revision, and an explicit continuation request before Cursor could self-select an **existing** issue. That gate is **obsolete for Cursor** under autonomous authority. Retain the checklist below only as optional hygiene when selecting from the existing queue:

1. Prefer policy text that matches `origin/main` when editing this file.
2. Prefer an explicit continuation request when the session was review-only.
3. Do not select a parent umbrella as the coding slice when children own the boundary.

## Roles

| Role | Authority |
| --- | --- |
| **Hermes / orchestrator** | Starts sessions, states standing objectives, may make an **explicit** implementation-continuation request when no slice is named. |
| **Cursor (after gate)** | Selects one eligible existing issue, records delegated approval evidence, plans, implements, ships under `implementation-lite`. |
| **Independent PR review + CI** | Remain mandatory. Delegation never replaces Greptile/CodeRabbit/Amazon Q/human review or green CI. |
| **Human** | May revoke delegation, name a different issue, or reject a recorded decision in Linear/chat. |

## Bounded approval authority (after gate)

When continuation is authorized and the user has not named an issue, Cursor follows the current work-selection rules in `docs/cursor-autonomous-authority.md`. Check Linear for the current coding slice and eligibility; the manifest and handoff are historical projections and do not gate selection or establish lifecycle state. Subject to those rules, Cursor may:

1. **Assess** current Linear scope, status, priority, relationships and blockers. The backlog and manifest are non-authoritative records; do not use their ordering to select or rank executable work.
2. **Select** exactly one **existing** Linear issue that passes eligibility below.
3. **Create** the feature branch from current `main` (slice-doc branch name or Linear `gitBranchName`) **before** writing repository audit files.
4. **Record** a delegated approval decision (audit evidence) before feature coding.
5. Set that issue **In Progress**, create/update `planning/*-slice.md` when missing, update handoff/manifest for the pick, then implement in the same session under `.cursor/rules/implementation-lite.mdc`.

If a sole Linear In Progress coding slice exists, **resume it** under the current work-selection rules. A manifest entry without a matching current Linear In Progress coding slice is not a resume target. Deferred producer remainders, umbrella-scale parents, and blocked live-source work are not coding slices merely because a projection lists them.

Do **not** exercise this path inside a merge Phase B closeout session. Phase B stays plan/remind-only; the required **new** agent chat may invoke delegated selection when continuation is requested.

### Eligibility (all required)

- Issue already exists in Linear (and GitHub mirror when present).
- Status is Backlog or Todo (not Done, Canceled, Duplicate).
- Verify that the issue is not already completed using current Linear and GitHub evidence; a manifest entry alone is not lifecycle authority.
- Not a parent umbrella: reject when Linear shows child issues under the candidate (`list_issues` with `parentId`), or when the body requires child-only implementation (SPE-1052 and similar are never eligible as the coding slice).
- `get_issue` acceptance criteria fit one coherent coding slice. A slice doc may document the boundary but does not replace usable acceptance criteria unless the approved issue body and slice doc both state the same satisfiable bar (or the delegated record explicitly narrows to a documented sub-boundary still inside that body — no silent scope expansion).
- No open `blockedBy` blockers (Done/Canceled blockers do not block).
- A `planning/*-slice.md` exists, or the delegated record creates one on the feature branch before the first feature code edit.
- Not a harvest-only or contradiction-only issue that changes no game behavior unless the issue body itself is the approved docs/workflow boundary.

### Selection order

Compare eligible issues using current Linear state, priority, relationships, blockers, and scope under `docs/cursor-autonomous-authority.md`. Neither the backlog shortlist nor manifest `primary`, `recentlyShipped`, or JSON ordering establishes selection order. Verify any potentially relevant shipped evidence and relationships against its authoritative source.

1. If the human named an issue, select that issue when it passes eligibility; a named issue outranks every comparison below.
2. Otherwise resume the sole Linear **In Progress** coding slice.
3. Otherwise select the eligible issue with the highest current Linear priority, treating Urgent as highest and no-priority issues as last; when priorities are equal, prefer fewer unmet `blockedBy` blockers, then the lower issue number.
4. If no eligible issue remains, stop with `no_eligible_issue`. If two issues still tie because Linear priority or blocker data is missing or conflicting, stop and ask. Do not invent a pick.

### Phase authority bounds

| Action | Allowed after gate? |
| --- | --- |
| Read-only assessment, parent/child compare, contradiction matrix against existing owners | Yes |
| Select one existing eligible issue and record delegated approval | Yes |
| Lifecycle: In Progress → PR comment → Done after merge | Yes |
| Create a new Linear issue, child, parent, relationship, or reparent | **No** under this policy |
| Expand an existing issue’s durable Goal/Scope/Acceptance | **No** |
| Cancel Done parents, weaken CI/lint/tests, skip independent PR review | **No** |
| Harvest batch close / candidate-ledger frontier edits | **No** (still ChatGPT / harvest docs) |
| Standalone Phase 1 candidate that needs a new issue (e.g. SPE-3382 C1) | Preserve as candidate; do **not** Phase-4 create under this policy |

New durable boundaries remain Phase 1 → Phase 2 → Phase 3 (mandatory contradiction review) → Phase 4 with **human** Phase-4 authorization unless a later amendment expands this document. Those phases apply only to candidate extraction/reconciliation → backlog-shape mutation; they do not gate lifecycle/evidence Linear updates on already-approved issues.

## Decision criteria (must document)

Every delegated selection comment and slice-doc approval block must state:

1. **Linear state** — sole In Progress coding slice (or none), candidate statuses and priorities, unmet `blockedBy` blockers, clean-main / open-PR check.
2. **Candidates compared** — at least three named alternatives when available, or why fewer exist.
3. **Priority / dependency / feasibility / scope / architectural readiness** — one line each for the winner.
4. **Duplication check** — why the pick is not already satisfied by verified shipped evidence (Linear Done status or a merged PR) or Done children.
5. **Contradiction review** — conflicts with shipped owners, STOP holds (e.g. SPE-3043), and held issues (e.g. SPE-3121 / SPE-3107); disposition for each.
6. **Eligibility checklist** — each eligibility bullet true/false.
7. **Decision** — `delegated_approve` for the single SPE id, or `no_eligible_issue` (then stop and ask).
8. **Prohibitions honored** — no new issue created; parent umbrella not selected; PR review preserved.

## Audit evidence (mandatory before coding)

Record all of:

1. Linear comment on the selected issue titled `Delegated approval (Cursor)` with the decision criteria block and date/`main` SHA.
2. Matching section in `planning/<slice>.md` under `## Delegated approval`.
3. Handoff update: set **In progress** to that SPE in `planning/backlog.md` and `planning/backlog-handoff-manifest.json`; run `npm run verify:backlog-handoff`.
4. Session report before first code edit using the mandatory `## Next slice` block from `.cursor/skills/cp-next-implementation-slice/SKILL.md` (Issue / Why / Skipped / Slice doc / Branch), plus `Authority: delegated (origin/main docs/cursor-delegated-backlog-approval.md @ <blob-or-commit>)`.

Idempotent: if the same SPE already has a delegated-approval comment with the same SHA and decision, do not duplicate; resume that issue.

## Prohibited scope changes (hard)

- Selecting SPE-1052 (or any parent umbrella) as the coding slice.
- Creating or attaching children because assessment found missing work.
- Treating deferred rows, review nits, or C1-class candidates as approved implementation.
- Reopening Done/Canceled issues without human instruction.
- Implementing before the audit evidence above exists.
- Claiming this policy effective from a feature branch or unmerged PR.

## Preserved controls

- Independent full-diff review vs `main` before merge (`implementation-lite` babysit).
- External bot/human comment triage.
- Contradiction checks against existing owners and STOP/hold language in backlog/slice docs.
- Fail-closed when eligibility or approval state is ambiguous.

---

## Read-only assessment snapshot (pre-effectiveness; not an approval)

Evidence date: 2026-10-15. Base `main`: `74be160472d68316b46df9ff2c2fd7ad78a86372` (SPE-1667 / PR #4312). Manifest: `primary` SPE-1052; `inProgress` `[]`; recently shipped head includes SPE-1667, SPE-2102, SPE-3389–SPE-3380. Handoff **In progress: (none)**. Open PRs: none at assessment start. Linear MCP unavailable in-session; GitHub mirrors and repo docs used.

### Compared candidates

| Candidate | Relation | Verdict |
| --- | --- | --- |
| SPE-1052 / GH #1061 | Primary umbrella | **Ineligible** — parent; implement through children only |
| SPE-1058 / GH #1067 | SPE-1052 child | **Not one-slice ready** — slice-1 registry shipped; remaining ACs (automation, succession, priority conflict, …) exceed one coherent slice without further human-authorized decomposition |
| SPE-1591 / GH #1591 | SPE-1052 child (delegated management) | **Deferred** — large multi-attribute boundary; depends on mature maintenance/lifecycle seams; higher risk than threshold layer |
| SPE-3121 | Scar / recoverable hold | **Blocked** — handoff: held for SPE-3107 reconciliation |
| Assignment navigation | Follow-on to SPE-3136 | **Candidate only** — SPE-3136 deferred table: no approved destination screen/route |
| SPE-1605 remaining wires | Historical-route | **STOP** — SPE-3043 ownership stop; SPE-1667 does not unlock mid-week `remove_asset` |
| SPE-3382 C1 hydration repair | Candidate | **Phase 1 only** — no issue created; not selectable |
| SPE-3343 / GH #4230 | Research throughput owner | Strong alternate; not required to be under SPE-1052; architectural fold from SPE-3382 F2/F3/F4 |
| **SPE-1481 / GH #1495** | Facility output thresholds; SPE-1052-adjacent productive-readiness owner | **Highest-value bounded existing child-class issue** for next implementation after facility lifecycle/dependency/unlock stack (SPE-3380–SPE-3389) |

### Why SPE-1481

- Priority: unblocks “installed ≠ productive” after SPE-3382 accepted folds to SPE-1481 / SPE-3386.
- Dependencies: lifecycle kernel, dependency inputs, post validity, and capability unlocks recently shipped; not blocked by SPE-3043 or SPE-3121 holds.
- Feasibility: open GitHub #1495 with Goal/Scope/Acceptance; deterministic threshold layer; no second facility model.
- Scope: smaller than SPE-1058 remainder or SPE-1591 delegation politics; still needs a `planning/*-slice.md` and possible explicit sub-boundary before coding.
- Architectural readiness: consumers already distinguished installed vs effective capacity; this issue owns output activation thresholds.
- Duplication: not in `recentlyShipped`; SPE-3382 was evidence-only; SPE-3387 gates post capacity, not site output bundles.

### Decision under current (pre-gate) rules

`no_eligible_approved_slice_for_self_start` — policy not effective; **do not** set SPE-1481 In Progress or implement under delegated authority in this session.

After this document merges to `main`, a later Cursor session may run the full eligibility + audit evidence path and, if still eligible, `delegated_approve` SPE-1481 (or another winner if queue state changed).
