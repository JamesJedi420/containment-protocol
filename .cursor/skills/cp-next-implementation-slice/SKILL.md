---
name: cp-next-implementation-slice
description: "Select next eligible Containment Protocol implementation slice using deterministic rules."
version: 1.0.0
author: JamesJedi420
license: MIT
platforms: [windows]
category: software-development
---

## When to Use

Use this skill for routine Containment Protocol implementation selection:
- No pre-approved Linear issue URL provided by user
- Need to find next eligible implementation slice from backlog
- Do NOT perform candidate reconciliation or governance analysis unless `docs/cursor-delegated-backlog-approval.md` is on `origin/main` and that policy's effectiveness gate is satisfied

**Do NOT use when:**
- User has explicitly named a next approved Linear issue URL
- Performing policy amendment (separate, one-time governance change)
- No eligible issue exists and delegated approval is **not** yet effective on `main` (stop and ask; do not self-approve)

## Deterministic Controller Guard

**CRITICAL:** The skill MUST reject parent umbrella issues before entering IMPLEMENT phase.

**Rule:** Parent umbrella issues (like SPE-1052) that require implementation through bounded child slices are NEVER eligible for direct implementation.

**Before selecting:**
1. Check Linear issue description for explicit parent/child requirement
2. If umbrella issue detected, reject it immediately
3. Select one child slice instead (never the umbrella itself)

**After selection, verify:**
- Selected child has Backlog/Todo status (not Recently Shipped)
- Implementation-sized scope (bounded, single-slice satisfiable)
- Dependencies unblocked
- Acceptance criteria present OR existing slice documentation exists
- Issue is not recently shipped

**If no eligible child exists:** Report `NO_ELIGIBLE_SLICE`. If delegated approval is effective on `main`, continue under `docs/cursor-delegated-backlog-approval.md` (select one existing eligible issue + audit evidence). Otherwise stop and ask for a Linear URL, slice doc, and branch.

**Time limit:** 5 minutes for selection. If longer, obtain progress checkpoint identifying actual blocker instead of silently waiting.

## Eligibility Criteria

A slice is eligible if ALL of the following are true:

1. **Status:** Backlog/Todo (not Recently Shipped)
2. **Scope:** Implementation-sized (bounded, single-slice satisfiable)
3. **Dependencies:** Unblocked
4. **Acceptance:** AC present OR existing slice doc exists
5. **Parent check:** Not a primary parent umbrella (must be a child slice)
6. **Recent shipping:** Not recently shipped

## Output Requirements

When a valid selection is made, output MUST include:
- Exact Linear ID
- Linear URL
- Slice doc or acceptance source
- Branch name
- Eligibility evidence (for each criterion)
- Any prerequisite blockers

**Format:**
```
Selected: SPE-XXXX
URL: https://linear.app/...
Source: slice-doc.md or issue AC
Branch: feature/spe-xxxx
Eligibility:
  - Status: Backlog/Todo ✓
  - Scope: implementation-sized ✓
  - Dependencies: unblocked ✓
  - AC: present ✓
  - Parent check: not umbrella (or: child of SPE-YYYY) ✓
  - Recent shipping: not recently shipped ✓
Blockers: [none or list]
```

## Selection Order

Follow deterministic selection order from backlog:
1. Read `planning/backlog-handoff-manifest.json`
2. Read `planning/backlog.md`
3. Filter by eligibility criteria above
4. Select first matching issue in manifest order
5. Report `NO_ELIGIBLE_SLICE` if none match

## Implementation

When exactly one issue wins:
1. Read the Linear issue
2. Read the slice doc (or use issue AC)
3. `save_issue` with In Progress status
4. Create branch from current main SHA
5. Implement the plan in the SAME session

## Hard Invariants

- **Never select SPE-1052** (or any primary parent umbrella)
- **Always select one child slice** when umbrella detected
- **5-minute limit:** If selection takes longer, obtain checkpoint
- **Report `NO_ELIGIBLE_SLICE`** if no eligible child exists
- **Implement in same session** after selection

## References

- `docs/cursor-delegated-backlog-approval.md` — Bounded delegated selection/approval (effective only on `main`)
- `.cursor/rules/cursor-delegated-backlog-approval.mdc` — Always-apply effectiveness gate
- `.cursor/rules/no-candidate-reconciliation.mdc` — Default ChatGPT ownership until delegation is effective
- `references/parent-umbrella-detection.md` — How to detect parent/child relationships
- `references/slice-eligibility-checklist.md` — Full eligibility checklist
- `references/5-minute-selection-timer.md` — Timer and checkpoint pattern
