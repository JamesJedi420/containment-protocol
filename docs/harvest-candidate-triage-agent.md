# Harvest candidate triage — agent workflow

**Purpose:** End-to-end instructions for agents reconciling pattern-harvest batches to Linear and in-repo mirrors. Use for SPE-2110 intake work and docs-only mirror PRs (`docs/harvest-linear-mirror` or equivalent).

**Related:**

- [`planning/harvest-reconciliation-index.md`](../planning/harvest-reconciliation-index.md) — batch index (row only after `*-harvest.md` exists)
- [`docs/harvest-fold-in-linear-comments.md`](./harvest-fold-in-linear-comments.md) — per-owner Linear comments (four questions)
- [`docs/harvest-mirror-owner-map-qa.md`](./harvest-mirror-owner-map-qa.md) — owner map ↔ outcome table checks before PR

---

## Session checklist (same turn)

1. **Linear** — Set [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) (or assigned slice) **In Progress** before adjudication (`AGENTS.md`, `.cursor/rules/linear-always-update.mdc`).
2. **Adjudicate** — Per candidate: verdict (`fold_in` / `no_op` / `contradiction_check` / `new child`), **Owner(s)** in the per-candidate table, one-line note. Repo read for dedup against prior batches.
3. **Mirror doc** — Add or update `planning/<batch-id>-harvest.md` with adjudication summary, **Primary owner map**, and **Per-candidate outcomes** (authoritative for owners).
4. **Owner-map QA** — Run [`docs/harvest-mirror-owner-map-qa.md`](./harvest-mirror-owner-map-qa.md) before commit.
5. **Linear closure** — SPE-2110 intake summary comment; **fold-in comment on every distinct SPE owner** that received a fold-in or contradiction row (not deferred). Format: [`docs/harvest-fold-in-linear-comments.md`](./harvest-fold-in-linear-comments.md).
6. **Index + PR** — Append row to `planning/harvest-reconciliation-index.md`; open **docs-only** PR (no `src/` or implementation slice on the mirror branch).

---

## Authoritative sources

| Artifact | Role |
| -------- | ---- |
| **Per-candidate outcomes** (`Owner(s)` column) | **Authoritative** for which SPE-#### owns each candidate |
| **Primary owner map** | Rollup index for humans and PR review; must be reconciled to the table |
| **No-op table** (if present) | Explains dedup; owners there must still match detail rows for `no_op` candidates |
| **Linear fold-ins** | Boundary clarification on owners; must not contradict the mirror doc |

---

## Branch and PR rules

- Mirror batches land on a **docs-only** branch (e.g. `docs/harvest-linear-mirror`). Do not mix harvest commits with implementation slices.
- PR body links the **slice / triage issue** (SPE-2110 or child), not only the parent epic.
- Automated review (e.g. owner-map vs table) is expected; fix mismatches on the branch before merge.

---

## Fold-in vs mirror

- The mirror doc holds the **full** candidate table.
- Fold-ins are **not** a paste of the table; they answer the four boundary questions on each owner.
- Hub comment on SPE-2110 = batch summary only (counts, batch id, mirror path).

---

## When Linear MCP is unavailable

Post the exact comments and status changes you would have made; do not treat GitHub linkback as closure. Retry when MCP is available.
