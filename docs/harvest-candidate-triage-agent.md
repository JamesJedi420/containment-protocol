# Harvest candidate triage — agent workflow

**Purpose:** Reconcile source-derived **candidates** (pattern rows **C1…Cn**) to existing Containment Protocol owners without treating extraction or triage as permission to create backlog scope.

**Related:**

- [`planning/harvest-reconciliation-index.md`](../planning/harvest-reconciliation-index.md) — batch index
- [`docs/harvest-fold-in-linear-comments.md`](./harvest-fold-in-linear-comments.md) — required Linear comment shape
- [`docs/harvest-mirror-owner-map-qa.md`](./harvest-mirror-owner-map-qa.md) — owner map ↔ outcome-table checks

---

## Governance boundary

Harvest triage is reconciliation evidence, not autonomous issue creation.

- Existing approved owners may receive non-scope-expanding traceability comments.
- A candidate that does not truthfully fit an existing owner is a **missing-boundary candidate**, not a new child yet.
- New parents, children, contradiction issues, relationships, reparenting, or durable scope must pass the normal approval flow before Linear mutation:
  1. Phase 1 — candidate assessment and production decomposition;
  2. Phase 2 — parent reconciliation and approval;
  3. Phase 3 — child/supporting-work reconciliation, mandatory contradiction review, and approval;
  4. Phase 4 — approved Linear update.
- If approval state is unclear, fail closed and leave the candidate non-authoritative.

## What a candidate is

| Term | Meaning |
| ---- | ------- |
| **Candidate (C##)** | One abstracted design/mechanic pattern from a source packet — pattern-only, no franchise import. |
| **Batch** | One reconciliation pass (`<batch-id>-harvest.md`). Batch size should preserve reconciliation accuracy; do not force an arbitrary count. |
| **Verdict** | `fold_in`, `no_op`, `contradiction_check`, `documentation_only`, or `missing_boundary_candidate`. |
| **Owner(s)** | Existing Linear SPE issue(s) that may already own the pattern; proposed ownership is not authoritative until the required phase approval. |

Your job is **not** to ship code or manufacture issue structure in the mirror PR. It is to adjudicate, document, and preserve evidence so the normal approval workflow can decide whether any backlog mutation is warranted.

---

## Session checklist

1. **Linear context** — inspect SPE-2110 (or the assigned already-approved slice) and relevant existing owners. Do not create a slice merely because triage work exists.
2. **Repo read** — deduplicate against prior `planning/*-harvest.md`, relevant code, audits, and current Linear authority.
3. **Adjudicate each C##** — record verdict, likely existing owner(s), mechanic summary, dependencies, and contradiction risks.
4. **Boundary decision** — apply the shared-boundary test in [`docs/harvest-fold-in-linear-comments.md`](./harvest-fold-in-linear-comments.md):
   - same approved implementation boundary → fold-in candidate;
   - no truthful existing owner → `missing_boundary_candidate` for the phased governance flow;
   - do **not** create a child during triage.
5. **Mirror doc** — `planning/<batch-id>-harvest.md`: summary counts, candidate outcomes, provenance, and proposed/matched owners.
6. **Owner-map QA** — run [`docs/harvest-mirror-owner-map-qa.md`](./harvest-mirror-owner-map-qa.md).
7. **Linear traceability** — post rich comments only to existing approved owners when the comment does not expand their durable scope. Missing-boundary candidates remain in the candidate/reconciliation ledger until approvals authorize Phase 4.
8. **Index + PR** — add the batch row to `harvest-reconciliation-index.md`; docs-only PR.

---

## Authoritative sources

| Artifact | Role |
| -------- | ---- |
| **Candidate/reconciliation ledger** | Durable candidate identity, provenance, disposition, approval state, and contradiction result. |
| **Per-candidate mirror outcomes** | Repository mirror of the triage evidence; not backlog authority. |
| **Linear owner comments** | Traceability/spec clarification only when they do not expand an existing approved boundary. |
| **Primary owner map** | Rollup index; proposed/matched ownership until approved where scope changes. |
| **Phase 4 issue links** | Authoritative delivery owners only after the required approvals have authorized creation or scope mutation. |

---

## Linear vs mirror depth

| Too thin | Correct |
| -------- | ------- |
| Note: “Stress-dream motif” | Note: 2–4 sentences on trigger, state, subsystem tie-in, and verdict. |
| Linear: “Fold-in C48” | Rich mechanic, repo anchor, ownership reasoning, boundary, and disposition. |
| Mirror-only closure | Mirror plus any legal existing-owner traceability; candidate ledger preserves unresolved/missing-boundary work. |

---

## Branch and PR rules

- Docs-only branch; no implementation commits on mirror PRs.
- Link an existing approved triage/workflow issue when one owns the docs work; otherwise use a workflow/docs PR without inventing a feature issue.
- Fix owner-map review comments by aligning map to candidate evidence, not by converting candidates into unapproved scope.

---

## When Linear tooling is unavailable

Draft the durable candidate/owner notes in the session output and repository mirror. Do not treat GitHub, chat, or a one-line note as feature/backlog approval. When Linear becomes available, apply only legal traceability/lifecycle updates; any scope mutation still requires the phased approvals.
