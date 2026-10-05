# Harvest candidate triage — agent workflow

**Purpose:** Reconcile source-derived **candidates** (pattern rows **C1…Cn**) to existing Containment Protocol owners without treating extraction or triage as permission to create backlog scope.

**Related:**

- [`planning/harvest-reconciliation-index.md`](../planning/harvest-reconciliation-index.md) — batch index and pending-ledger-apply queue
- [`docs/harvest-fold-in-linear-comments.md`](./harvest-fold-in-linear-comments.md) — required Linear comment shape
- [`docs/harvest-mirror-owner-map-qa.md`](./harvest-mirror-owner-map-qa.md) — owner map ↔ outcome-table checks
- [Candidate extraction and reconciliation ledger — canonical workflow](https://linear.app/spectranoir/document/candidate-extraction-and-reconciliation-ledger-canonical-workflow-6b56ad41aebf) — durable candidate identity, provenance, reconciliation, approval state, and contradiction record

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
- The durable destination for unresolved/missing-boundary candidate state is the Linear **Candidate extraction and reconciliation ledger — canonical workflow** linked above (plus the source-specific candidate ledger when one exists), not an invented feature issue.
- When Linear is unavailable, the repository mirror becomes a **pending apply queue only**: it preserves an exact canonical-ledger payload until an authenticated agent applies it. That pending block is evidence, not feature/backlog authority.

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
   - same approved implementation boundary → `fold_in`;
   - no truthful existing owner → `missing_boundary_candidate` for the phased governance flow;
   - do **not** create a child during triage.
5. **Mirror doc** — `planning/<batch-id>-harvest.md`: summary counts, candidate outcomes, provenance, and proposed/matched owners.
6. **Owner-map QA** — run [`docs/harvest-mirror-owner-map-qa.md`](./harvest-mirror-owner-map-qa.md).
7. **Durable ledger + Linear traceability** — persist unresolved/missing-boundary candidates to the canonical Linear candidate ledger. Post rich comments only to existing approved owners when the comment does not expand their durable scope. Missing-boundary candidates remain non-authoritative until approvals authorize Phase 4.
8. **Index + PR** — add the batch row to `harvest-reconciliation-index.md`; docs-only PR. The row must state whether the canonical-ledger apply is `applied` or `pending apply`.

---

## Authoritative sources

| Artifact | Role |
| -------- | ---- |
| **Canonical Linear candidate ledger** | Durable candidate identity, provenance, disposition, approval state, contradiction result, and queue/frontier. |
| **Per-candidate mirror outcomes** | Repository mirror of triage evidence; not backlog authority. |
| **Pending canonical-ledger apply block** | Durable repository queue used only when Linear is unavailable; must contain the exact payload needed for later authenticated ledger writeback and remains non-authoritative for feature scope. |
| **Linear owner comments** | Traceability/spec clarification only when they do not expand an existing approved boundary. |
| **Primary owner map** | Rollup index of matched/proposed owners; it does not confer Linear ownership or approval. |
| **Phase 4 issue links** | Authoritative delivery owners only after the required approvals have authorized creation or scope mutation. |

---

## Linear vs mirror depth

| Too thin | Correct |
| -------- | ------- |
| Note: “Stress-dream motif” | Note: 2–4 sentences on trigger, state, subsystem tie-in, and verdict. |
| Linear: “Fold-in C48” | Rich mechanic, repo anchor, ownership reasoning, boundary, and disposition. |
| Mirror-only closure | Mirror plus canonical candidate-ledger record, or a durable pending-ledger-apply block when Linear is unavailable, plus any legal existing-owner traceability. |

---

## Branch and PR rules

- Docs-only branch; no implementation commits on mirror PRs.
- Link an existing approved triage/workflow issue when one owns the docs work; otherwise use a workflow/docs PR without inventing a feature issue.
- Fix owner-map review comments by aligning map to candidate evidence, not by converting candidates into unapproved scope.
- A batch with `pending apply` is not canonically closed merely because the mirror PR merges. The pending queue entry must survive until an authenticated agent records the payload in the canonical Linear ledger.

---

## When Linear tooling is unavailable

Do **not** leave the required ledger write as chat-only work and do not falsely mark the batch as canonically applied.

1. Complete the repository mirror with all evidence/provenance needed for the canonical candidate ledger.
2. Add a `## Pending canonical-ledger apply` section to `planning/<batch-id>-harvest.md` containing, for every unapplied candidate, the exact ledger fields needed by the canonical workflow: candidate ID, source/context, concept/evidence, lifecycle status, reconciliation batch, verdict/disposition mapping, matched/proposed owner, canonical result, related candidates/dependencies, rationale, protocol-change class, approval states, contradiction status/findings/authorities/resolution, and any known timestamps/provenance links.
3. Mark the batch row in `planning/harvest-reconciliation-index.md` **`pending apply`** and point it to that mirror section. This is the durable queue for a later authenticated agent.
4. Do not post owner comments that cannot be verified/applied. Do not create a feature issue, child, parent, relationship, or contradiction issue as a substitute.
5. A later agent with Linear access must process pending rows oldest-first: verify the mirror payload against current authority, apply the legal canonical-ledger/traceability records idempotently, record the resulting Linear ledger references in the mirror/index, and change the queue state to **`applied`**. Any feature/backlog mutation still requires the normal phase approvals and Phase 4.

A pending repository block is durable transport only. It never makes a candidate accepted CP scope or backlog authority.
