# Harvest comments on Linear (owner + hub)

**Purpose:** Preserve durable, agent-readable traceability for reconciled harvest candidates without letting a comment or triage verdict silently create or expand backlog scope.

A future agent should be able to understand the mechanic, evidence, likely ownership, boundaries, and disposition without reopening the source packet.

**When:** Same reconciliation session as the candidate adjudication. See `planning/harvest-reconciliation-index.md`, `docs/harvest-candidate-triage-agent.md`, and the canonical Linear [Candidate extraction and reconciliation ledger — canonical workflow](https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf).

---

## Governance boundary

This document does **not** authorize issue creation.

- A fold-in comment may clarify an **existing approved owner** only when it stays inside that owner’s durable boundary.
- If the candidate cannot truthfully fit an existing approved owner, classify it as `missing_boundary_candidate`.
- Do not create a child, coordinator, contradiction issue, relationship, or expanded owner boundary during harvest triage.
- Missing-boundary and scope-changing candidates must pass Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4 before backlog mutation.
- If approval state is missing or ambiguous, fail closed and preserve candidate evidence in the canonical Linear candidate ledger.

## Canonical harvest disposition identifiers

Use these exact identifiers in mirror tables, Linear comments, summary counts, and QA:

- `fold_in`
- `no_op`
- `contradiction_check`
- `documentation_only`
- `missing_boundary_candidate`

After a Phase 4 update has actually created or changed the delivery issue, link that SPE issue separately as the authoritative result; do not replace the historical candidate disposition identifier.

## Required content for existing-owner traceability

Use all six sections when posting a legal non-scope-expanding owner comment. If a section is N/A, state that explicitly.

| # | Section | What to include |
| --- | --- | --- |
| 1 | **Candidate & source** | Candidate ID, batch ID, source type, and the abstracted pattern. |
| 2 | **Mechanic (agent-readable)** | CP-native behavior: triggers, state, player-facing effect, persistence, failure modes, and loop/site/case ties as applicable. |
| 3 | **Repo / subsystem anchor** | Existing files, modules, audits, shipped behavior, or approved SPE scope. |
| 4 | **Ownership & reconciliation** | Existing primary owner and co-owners checked; explain whether ownership is matched, proposed, or unresolved. |
| 5 | **Boundary** | What an existing owner already permits this comment to clarify; explicitly state what would be new scope and is therefore excluded. |
| 6 | **Disposition & governance state** | One canonical disposition identifier plus current approval phase when scope change is proposed. |

---

## Same-boundary test

| Existing-owner `fold_in` may be appropriate | `missing_boundary_candidate` — approval required before issue creation |
| --- | --- |
| Same implementation boundary, modules, state authority, and acceptance envelope already owned by the issue. | Distinct Definition of Done that cannot truthfully fit the existing owner. |
| Adds bounded clarification/guardrail to behavior the issue already owns. | Requires a new top-level subsystem, registry, state authority, or cross-cutting contract. |
| Would ship inside the same already-approved implementation slice. | Requires an independently reviewable implementation slice not already approved. |
| Co-owners are consulted but one existing owner remains clearly authoritative. | Ownership cannot be resolved without changing parent boundaries or creating a coordinator. |
| `no_op`, `documentation_only`, or `contradiction_check` traceability that does not alter scope. | Any durable obligation that would expand Goal/Scope/Acceptance Criteria beyond the approved boundary. |

**When unsure:** fail closed. Record `missing_boundary_candidate` in the canonical candidate ledger and route it through the phased governance workflow. Do not default to creating a child.

Two candidates that share a future implementation boundary may later reconcile into one approved child; that is a Phase 3 decision, not a harvest-triage side effect.

---

## Disposition meanings

| Identifier | Meaning |
| --- | --- |
| `no_op` | No implementation change; existing state already covers the concept or the candidate is a non-actionable dedup. |
| `documentation_only` | Documentation/authoring consequence only; no feature issue creation implied. |
| `fold_in` | Existing approved owner can absorb the clarification without changing its durable boundary. |
| `contradiction_check` | Durable conflict requires reconciliation; finding the conflict does not itself authorize a new issue. |
| `missing_boundary_candidate` | No truthful existing approved owner; requires Phase 1–3 approvals and Phase 4 before any new issue/child is created. |

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
- **Existing owner checked:** [SPE-####](url) — <matched / proposed / does not fit>
- **Co-owners checked:** <links + role>
- **Dedup / prior candidate:** <reference or none>

### 5. Boundary
**Inside existing approved scope:**
- <clarification that is already within owner boundary, or “none”>

**Would be new scope and is excluded until approved:**
- <candidate obligations>

### 6. Disposition & governance state
- **Disposition:** <fold_in | no_op | contradiction_check | documentation_only | missing_boundary_candidate>
- **Current phase:** <not required | Phase 1 | Phase 2 | Phase 3 | Phase 4 complete>
- **Reasoning:** <same-boundary / missing-boundary rationale>
- **Candidate ledger:** <candidate ID / ledger record reference>

**Traceability:** `planning/<batch-id>-harvest.md` (row C##)
```

### Grouping

Group candidates only when they share the same existing owner or same proposed owner, same disposition, and same acceptance envelope. Give each C## enough mechanic detail to stand on its own.

---

## Mirror `Note` column

Minimum per row:

- 2–4 sentence mechanic summary;
- canonical disposition identifier;
- matched/proposed owner state;
- approval phase when any scope mutation is proposed;
- pointer to existing-owner Linear traceability and/or the canonical candidate-ledger record.

Do not write “child SPE-####” unless that issue already existed or Phase 4 actually created it.

---

## Anti-patterns

- One-line candidate notes with no behavior or boundary.
- Treating a harvest verdict as backlog admission.
- Mixing human-friendly labels such as “doc note only” with the canonical disposition identifiers in summary counts.
- Creating a child because the candidate is independently testable before parent/child reconciliation is approved.
- Creating a coordinator because several owners appear relevant before Phase 2/3 resolves ownership.
- Expanding an existing issue through a comment when the candidate materially changes Goal/Scope/Acceptance Criteria.
- Implying priority from source order; queue priority belongs to the authoritative planning workflow.
- Using a historical `new child` verdict as evidence that a current issue may be created automatically.

---

## Hub intake (SPE-2110 or successor intake owner)

Batch closure may record counts by the five canonical disposition identifiers, batch ID, mirror path, matched/proposed owner list, unresolved contradictions, and `missing_boundary_candidate` records awaiting governance. List new issue IDs only when they already existed or the Phase 4 update has been approved and applied.
