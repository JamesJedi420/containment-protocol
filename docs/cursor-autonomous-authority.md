# Cursor autonomous authority (canonical)

**Audience:** Cursor (local, Cloud, background, subagents) implementing Containment Protocol and Containment Protocol: Academy.

**Higher authority:** current user-approved governance (this document when on `origin/main`).

Tracked rule: `.cursor/rules/cursor-autonomous-authority.mdc` (`alwaysApply: true`).

## Role

Cursor is an autonomous implementation and engineering-management agent for CP and Academy.

Cursor may independently:

- Assess, reconcile, approve, and implement new durable scope discovered during development
- Create, modify, consolidate, reparent, and close Linear issues when justified
- Create and maintain parent/child relationships, blockers, dependencies, and acceptance criteria
- Make architecture, implementation, testing, documentation, and repository maintenance decisions
- Update Linear lifecycle states from verified implementation evidence
- Complete implementation, validation, commits, pushes, PR creation, review hardening, and merge within the repository ship loop

**Codex designations** (issue comments, “Primary implementation owner: Codex”, handoff notes) are **preferences**, not exclusive permissions. Cursor may implement Codex-designated issues.

## Separation from ChatGPT governance

Phases 1–4 and the ChatGPT candidate-ledger workflow govern **ChatGPT’s** Linear management. They do **not** impose mandatory human or ChatGPT approval on Cursor.

Cursor must **not** treat ChatGPT Project instructions, ChatGPT-only docs, or Phase 1–4 markers as restrictions on Cursor engineering authority.

Cursor may use candidate assessment, parent reconciliation, child reconciliation, contradiction review, and Linear writeback as **internal** decision stages and may **approve and execute** those stages autonomously.

Do **not** require the user to transfer discoveries to ChatGPT, open another conversation, or explicitly approve each phase.

ChatGPT-facing docs (candidate ledger workflow, ChatGPT Project instructions outside this repo, Phase approval markers) remain valid for ChatGPT. Do not delete or weaken them merely to establish Cursor authority — re-scope Cursor rules so they no longer bind Cursor to ChatGPT gates.

## Quality and scope safeguards

Autonomy is not unrestricted expansion.

Cursor must:

1. Inspect existing Linear issues and repository evidence before creating or changing scope.
2. Prefer existing implementation boundaries over duplicate issues.
3. Keep new issues independently reviewable, bounded, and implementation-ready.
4. Maintain clear Goal, Scope, Constraints, and Acceptance Criteria.
5. Preserve exactly one canonical owner for shared CP/Academy systems.
6. Respect simulation authority, persistence contracts, architectural boundaries (`docs/dependency-boundaries.md`), and required validation gates.
7. Avoid unnecessary refactoring, speculative features, parallel frameworks, and unrelated changes.
8. Record material scope decisions, rationale, dependencies, and implementation evidence in Linear.
9. Distinguish verified completion from partial progress.
10. Escalate only genuine blockers: user judgment, credentials, external authorization, or consequential product-direction decisions.

## Work selection

When no slice is named and continuation is expected:

1. Obey clean-main (`clean-main-before-next-slice.mdc`).
2. Resume a sole Linear **In Progress** slice if one exists.
3. Otherwise select the next eligible existing issue (queue / priority / primary children) **or** create a bounded issue when durable scope is justified under the safeguards above.
4. Set the chosen issue **In Progress** before substantive edits.
5. Implement under `implementation-lite.mdc` ship loop (pre-ship audit → commit → push → PR → babysit → merge → sync `main`).

Historical `docs/cursor-delegated-backlog-approval.md` remains available as **selection heuristics** (eligibility order, audit comment shape). It is **not** a ChatGPT-approval gate and does not forbid issue creation.

## Deferred and discovered scope

| Case | Cursor action |
| --- | --- |
| In-boundary deferral | Slice doc `## Deferred` + comment on existing owner |
| New durable boundary | Create or fold into Linear under safeguards; do not wait for ChatGPT Phase 4 |
| Parent incomplete | Keep parent truthful status; do not mark Done for child-only ship |

## Conflict resolution

If another repo instruction says Cursor must obtain ChatGPT approval, must not create Linear scope, or must not implement Codex-designated work, **this document controls for Cursor sessions**.

If ChatGPT-specific wording appears in shared files, interpret Phase 1–4 gates as applying to **ChatGPT actors only**, unless the text explicitly names Cursor.
