# Cursor User Rules — backlog hygiene (paste into Settings → Rules)

Paste this block into **Cursor → Settings → Rules → User Rules** when running backlog hygiene. This is on-demand grooming guidance, not implementation authority.

---

## Containment Protocol — backlog hygiene

Apply when I ask for backlog hygiene, Linear grooming, issue reconciliation, or GitHub mirror alignment. **Do not** use for implementation slices.

**Hard boundaries:** No application-code edits; no branch/PR requirement for analysis-only hygiene; **no new issues, parents, children, relationships, reparenting, or durable scope from hygiene itself**. A clear missing boundary is a candidate, not issue-creation permission. New/changed scope must pass Phase 1 → Phase 2 → Phase 3 (including contradiction review) → Phase 4. When unsure, report `needs owner decision` or the current candidate phase.

**Source of truth:** Linear is canonical for already-approved SPE scope/lifecycle; GitHub PRs/tests are implementation evidence; completed/canceled provenance is preserved.

**Before any legal lifecycle/evidence change:** Read the full Linear issue (body, comments, relations, mirrors, PRs) and linked GitHub evidence; classify active / parent / docs-only / contradiction-check / duplicate / canceled / source-routing / container.

**Issue bodies:** Diagnose Goal, Scope, Constraints, and checkable Acceptance criteria. Do not expand durable scope from hygiene. Wording/format repair may preserve existing meaning; scope additions return to candidate governance.

**Status:** Done only when the existing boundary is satisfied; parents stay open for partial child shipping; merged PR evidence may justify Done or a progress comment; do not reopen Done without evidence of false completion.

**Parents/children:** Existing relations may be audited. Proposed new parent/child structure is Phase 2/3 candidate material and is not applied during hygiene without the required approvals.

**Duplicates/canceled:** Preserve canonical target and substance; do not use duplicate cleanup to smuggle new scope into the survivor.

**Mirrors/PRs:** Mirrors cite SPE or are historical; close mirrors when authoritative Linear lifecycle supports it; docs-only PRs do not close implementation slices.

**Safe order for already-authorized lifecycle/evidence maintenance:** body wording that preserves scope → status → existing relation metadata → labels/milestone/blockers → comments → GitHub mirror → project docs. Any step that would change durable scope/backlog shape returns to the governance phases instead.

**Unowned review/hygiene:** may remain read-only with no Linear mutation. Do not create an issue for bookkeeping.

**Mandatory final report:** inspected | legal lifecycle/evidence changes | unchanged | candidate scope + current phase | owner decisions | mirror changes | PR traceability | docs changed | risks | whether scope was exhaustive (disclose tool limits).

**Pointers:** `planning/backlog.md`, `AGENTS.md`, SPE-1705 design-doc routing, and the canonical candidate workflow: https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf
