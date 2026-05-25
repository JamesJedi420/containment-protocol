# Harvest candidate triage — agent workflow

**Purpose:** Reconcile **candidates** (pattern rows **C1…Cn** extracted from external source batches) to repo owners and **Linear**. Linear comments must let a **future agent** understand each **mechanic**, **ownership**, **boundaries**, and **fold-in vs new child** without re-opening the source packet.

**Related:**

- [`planning/harvest-reconciliation-index.md`](../planning/harvest-reconciliation-index.md) — batch index (row only after `*-harvest.md` exists)
- [`docs/harvest-fold-in-linear-comments.md`](./harvest-fold-in-linear-comments.md) — **required** Linear comment shape (six sections; not one-line)
- [`docs/harvest-mirror-owner-map-qa.md`](./harvest-mirror-owner-map-qa.md) — owner map ↔ outcome table checks before PR

---

## What a candidate is

| Term | Meaning |
| ---- | ------- |
| **Candidate (C##)** | One abstracted **design/mechanic pattern** from a source packet (walkthrough metadata, PDF, transcript, manual, etc.) — **pattern-only**, no franchise import. |
| **Batch** | One reconciliation pass (`<batch-id>-harvest.md`) with a fixed candidate count. |
| **Verdict** | `fold_in`, `no_op`, `contradiction_check`, or `new child` — whether CP needs to act and how. |
| **Owner(s)** | Existing Linear **SPE-####** that should absorb or coordinate the pattern. |

Your job is **not** to ship code in the mirror PR; it is to **adjudicate**, **document**, and **post rich Linear records** so implementation agents can execute later.

---

## Session checklist (same turn)

1. **Linear** — Set [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) (or assigned slice) **In Progress** before adjudication.
2. **Repo read** — Dedup against prior `planning/*-harvest.md` and relevant `src/` / audits named in the batch.
3. **Adjudicate each C##** — Verdict, **Owner(s)**, and a **mechanic summary** (2–4 sentences minimum) for the mirror table **Note** column.
4. **Issue decision** — Apply **fold-in vs new child** using the shared-boundary test in [`docs/harvest-fold-in-linear-comments.md`](./harvest-fold-in-linear-comments.md); create child issues when verdict is `new child`.
5. **Mirror doc** — `planning/<batch-id>-harvest.md`: summary counts, primary owner map, per-candidate outcomes (**Owner(s)** authoritative).
6. **Owner-map QA** — [`docs/harvest-mirror-owner-map-qa.md`](./harvest-mirror-owner-map-qa.md).
7. **Linear closure** — SPE-2110 batch summary; **per-owner comments** with full six-section payload (one comment per owner per mechanic cluster — see fold-in doc). **Do not defer** Linear because the mirror table exists.
8. **Index + PR** — Row in `harvest-reconciliation-index.md`; **docs-only** PR.

---

## Authoritative sources

| Artifact | Role |
| -------- | ---- |
| **Per-candidate outcomes** (`Owner(s)`) | Authoritative for which SPE-#### owns each candidate |
| **Note / mechanic column** | In-repo summary; must align with Linear §2 |
| **Linear owner comments** | **Primary handoff for future agents** — mechanic + boundary + disposition reasoning |
| **Primary owner map** | Rollup index; reconciled to the table before commit |
| **New child issues** | Own delivery when fold-in would violate shared-boundary test |

---

## Linear vs mirror (depth)

| Too thin | Correct |
| -------- | ------- |
| Note: “Stress-dream motif” | Note: 2–4 sentences on trigger, state, hub/site tie-in + verdict |
| Linear: “Fold-in C48” | Linear: six sections including **Mechanic** and **Disposition reasoning** |
| Mirror-only closure | Mirror + Linear both complete same session |

---

## Branch and PR rules

- Docs-only branch (e.g. `docs/harvest-linear-mirror`); no implementation commits on mirror PRs.
- PR links SPE-2110 or triage slice issue.
- Fix owner-map review comments by aligning map to table, not by thinning Linear text.

---

## When Linear MCP is unavailable

Draft full comments in the session output (six-section template); post when MCP works. Do not treat GitHub or a one-line mirror note as closure.
