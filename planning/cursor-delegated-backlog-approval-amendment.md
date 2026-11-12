# Workflow — Cursor delegated backlog approval amendment

| Field             | Value                                                          |
| ----------------- | -------------------------------------------------------------- |
| **Status**        | **In progress** (docs/governance amendment PR)                 |
| **Issue**         | none — workflow/docs-only                                      |
| **Branch**        | `docs/cursor-delegated-backlog-approval`                       |
| **Base main SHA** | `74be160472d68316b46df9ff2c2fd7ad78a86372`                     |

## Boundary

Adopt bounded Cursor delegated backlog selection/approval through ordinary PR review. No game runtime, schema, or Linear feature-scope mutation in this amendment.

## Ships

- Canonical policy: `docs/cursor-delegated-backlog-approval.md` (includes read-only assessment snapshot; **not** a Linear approval)
- Always-apply rule: `.cursor/rules/cursor-delegated-backlog-approval.mdc`
- Default reconciliation rule + picker skill + handoff/closeout/user-rule snippets updated for the effectiveness gate
- Recommended existing child-class issue for a **later** delegated session: SPE-1481 / GitHub #1495 (facility output thresholds)

## Effectiveness

Policy becomes effective only when the adopting PR merges and the canonical doc is on `origin/main`. This branch must not exercise delegated approval.

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Delegated approve + implement SPE-1481 | Later Cursor session after merge | Amendment not yet effective |
| Phase 4 create for SPE-1058 remainder / assignment navigation / C1 | Human governance | Explicitly prohibited by amendment |
