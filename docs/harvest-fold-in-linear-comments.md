# Harvest comments on Linear (owner + hub)

**Purpose:** Preserve durable, agent-readable traceability for reconciled harvest candidates without letting a comment or triage verdict silently create or expand backlog scope.

A future agent should be able to understand the mechanic, evidence, likely ownership, boundaries, and disposition without reopening the source packet.

**When:** Same reconciliation session as the candidate adjudication. See `planning/harvest-reconciliation-index.md` and `docs/harvest-candidate-triage-agent.md`.

---

## Governance boundary

This document does **not** authorize issue creation.

- A fold-in comment may clarify an **existing approved owner** only when it stays inside that owner’s durable boundary.
- If the candidate cannot truthfully fit an existing approved owner, classify it as a **missing-boundary candidate**.
- Do not create a child, coordinator, contradiction issue, relationship, or expanded owner boundary during harvest triage.
- Missing-boundary and scope-changing candidates must pass Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4 before backlog mutation.
- If approval state is missing or ambiguous, fail closed and preserve candidate evidence only.

## Required content for existing-owner traceability

Use all six sections when posting a legal non-scope-expanding owner comment. If a section is N/A, state that explicitly.

| # | Section | What to include |
| --- | --- | --- |
| 1 | **Candidate & source** | Candidate ID, batch ID, source type, and the abstracted pattern. |
| 2 | **Mechanic (agent-readable)** | CP-native behavior: triggers, state, player-facing effect, persistence, failure modes, and loop/site/case ties as applicable. |
| 3 | **Repo / subsystem anchor** | Existing files, modules, audits, shipped behavior, or approved SPE scope. |
| 4 | **Ownership & reconciliation** | Existing primary owner and co-owners checked; explain why this owner already contains the boundary. |
| 5 | **Boundary** | What the existing owner already permits this comment to clarify; explicitly state what would be new scope and is therefore excluded. |
| 6 | **Disposition & governance state** | `fold_in`, `no implementation change`, `doc note only`, `contradiction_check`, or `missing_boundary_candidate`; include current approval phase when scope change is proposed. |

---

## Same-boundary test

Use this test to decide whether an existing-owner comment is legal or whether the candidate must remain outside authoritative backlog scope.

| Existing-owner fold-in may be appropriate | Missing-boundary candidate — approval required before issue creation |
| --- | --- |
| Same implementation boundary, modules, state authority, and acceptance envelope already owned by the issue. | Distinct Definition of Done that cannot truthfully fit the existing owner. |
| Adds bounded clarification/guardrail to behavior the issue already owns. | Requires a new top-level subsystem, registry, state authority, or cross-cutting contract. |
| Would ship inside the same already-approved implementation slice. | Requires an independently reviewable implementation slice not already approved. |
| Co-owners are consulted but one existing owner remains clearly authoritative. | Ownership cannot be resolved without changing parent boundaries or creating a coordinator. |
| No-op, documentation-only, or contradiction traceability that does not alter scope. | Any durable obligation that would expand Goal/Scope/Acceptance Criteria beyond the approved boundary. |

**When unsure:** fail closed. Record a `missing_boundary_candidate` and route it through the phased governance workflow. Do not default to creating a child.

Two candidates that share a future implementation boundary may later reconcile into one approved child; that is a Phase 3 decision, not a harvest-triage side effect.

---

## Disposition labels

| Disposition | Meaning |
| --- | --- |
| **No implementation change** | No-op/dedup/traceability only; backlog scope unchanged. |
| **Doc note only** | Documentation consequence; no feature issue creation implied. |
| **Fold-in** | Existing approved owner can absorb the clarification without changing its durable boundary. |
| **Contradiction check** | Durable conflict requires reconciliation; finding the conflict does not itself authorize a new issue. |
| **Missing-boundary candidate** | No truthful existing owner; requires Phase 1–3 approvals and Phase 4 before any new issue/child is created. |
| **Approved Phase 4 issue** | Use only after the governance workflow has actually authorized and created/updated the delivery issue; link the resulting SPE issue for traceability. |

---

## Comment template

```markdown
**Harvest** — `<batch-id>` · **C##** · `<short mechanic title>`

### 1. Candidate & source
- **ID:** C##
- **Batch:** `<batch-id>` — <source type>
- **Extracted pattern:** <pattern-only abstraction>

### 2. Mechanic (agent-readable)
- <behavior, trigger, state, persistence>
- <player/system effect and failure modes>
- <loop/site/case relation if relevant>

### 3. Repo / subsystem anchor
- **Existing:** <files/modules/approved SPE/shipped behavior>
- **Unimplemented or uncertain:** <evidence gap; do not present as approved scope>

### 4. Ownership & reconciliation
- **Existing primary owner checked:** [SPE-####](url) — <why it owns this boundary, or why it does not>
- **Co-owners checked:** <links + role>
- **Dedup / prior candidate:** <reference or none>

### 5. Boundary
**Inside existing approved scope:**
- <clarification that is already within owner boundary, or “none”>

**Would be new scope and is excluded until approved:**
- <candidate obligations>

### 6. Disposition & governance state
- **Disposition:** <fold_in | doc note only | no implementation change | contradiction_check | missing_boundary_candidate | approved Phase 4 issue [SPE-####](url)>
- **Current phase:** <not required | Phase 1 | Phase 2 | Phase 3 | Phase 4 complete>
- **Reasoning:** <same-boundary / missing-boundary rationale>

**Traceability:** `planning/<batch-id>-harvest.md` (row C##)
```

### Grouping

Group candidates only when they share the same existing owner, same disposition, and same acceptance envelope. Give each C## enough mechanic detail to stand on its own.

---

## Mirror `Note` column

Minimum per row:

- 2–4 sentence mechanic summary;
- disposition;
- matched/proposed owner;
- approval state when any scope mutation is proposed;
- pointer to Linear traceability or candidate-ledger record.

Do not write “child SPE-####” unless that issue already existed or Phase 4 actually created it.

---

## Anti-patterns

- One-line candidate notes with no behavior or boundary.
- Treating a harvest verdict as backlog admission.
- Creating a child because the candidate is independently testable before parent/child reconciliation is approved.
- Creating a coordinator because several owners appear relevant before Phase 2/3 resolves ownership.
- Expanding an existing issue through a comment when the candidate materially changes Goal/Scope/Acceptance Criteria.
- Implying priority from source order; queue priority belongs to the authoritative planning workflow.
- Using a historical `new child` verdict as evidence that a current issue may be created automatically.

---

## Hub intake (SPE-2110 or successor intake owner)

Batch closure may record counts, batch ID, mirror path, owner list, dispositions, unresolved contradictions, and **missing-boundary candidates awaiting governance**. List new issue IDs only when they already existed or the Phase 4 update has been approved and applied.
