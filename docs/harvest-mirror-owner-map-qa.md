# Harvest mirror — primary owner map QA

**Purpose:** Prevent PR review churn from **Primary owner map** rows that disagree with **Per-candidate outcomes**, without mistaking mirror consistency for authoritative Linear ownership or approval.

**Workflow context:** [`docs/harvest-candidate-triage-agent.md`](./harvest-candidate-triage-agent.md)

---

## Authority rule

1. **Per-candidate outcomes** are authoritative only for the **mirror record** of each candidate: disposition plus matched/proposed owner evidence. They do not confer Linear ownership or authorize backlog mutation.
2. **Primary owner map** is a navigation rollup. It must reproduce the owner state recorded in the candidate row without upgrading `proposed` ownership to `approved` ownership.
3. For `fold_in`, `no_op`, `documentation_only`, and `contradiction_check`, list only existing SPE owners actually checked by reconciliation.
4. For `missing_boundary_candidate`, use the proposed/matched existing parent owner only when one has been identified; otherwise use `TBD — Phase 2`. Never invent an SPE ID to make the map complete.
5. New/changed authoritative ownership is established only by the approval workflow and Phase 4 Linear update.

Canonical harvest disposition identifiers:
- `fold_in`
- `no_op`
- `contradiction_check`
- `documentation_only`
- `missing_boundary_candidate`

---

## Common failures (fix before PR)

| Failure | Example | Fix |
| ------- | ------- | --- |
| Wrong SPE on map | C48 → `SPE-1653` on map but candidate row checked `SPE-1101, SPE-130` | Align map to row evidence |
| Proposed owner shown as authoritative | `missing_boundary_candidate` row proposes SPE-88 but map labels it as final owner | Mark as proposed / preserve current phase |
| Candidate on wrong rollup row | C94 map owner set differs from candidate row | Move/split row so the mirror agrees |
| Phantom owner | SPE listed on map but never checked in candidate row | Remove from map |
| Unresolved missing boundary gets invented SPE | Candidate has no truthful current owner but map assigns one | Use `TBD — Phase 2`; keep candidate in durable ledger |
| Grouped range hides mismatch | `C47–C48` grouped but owner state/disposition differs | Split the range |

---

## PR checklist (mirror doc)

- [ ] Every candidate ID appears in exactly one outcome row (or an explicit grouped row whose candidates share the same disposition and owner state).
- [ ] Each row uses one canonical disposition identifier.
- [ ] Map entries reproduce the candidate row’s **matched/proposed** owner evidence without implying approval that has not occurred.
- [ ] `missing_boundary_candidate` rows without a verified parent use `TBD — Phase 2`, not an invented SPE.
- [ ] `no_op`, `contradiction_check`, and `documentation_only` rows preserve the existing owners actually checked when relevant.
- [ ] Adjudication counts match table counts for `fold_in` / `no_op` / `contradiction_check` / `documentation_only` / `missing_boundary_candidate`.
- [ ] Dedup references do not contradict candidate outcomes.
- [ ] Candidate-ledger references exist for unresolved/missing-boundary work.
- [ ] Index row in `harvest-reconciliation-index.md` is not added until the mirror file exists at the same revision.

---

## Quick verification (agent)

For each candidate ID:

1. Read canonical disposition and owner state from the outcome table.
2. Find map row(s) containing that ID.
3. Confirm the map reproduces the same existing/proposed owners and does not upgrade proposed ownership to approved ownership.
4. For `missing_boundary_candidate`, confirm the candidate has a durable ledger record and that any unresolved parent is shown as `TBD — Phase 2`.
5. Confirm summary counts use the five canonical disposition identifiers.

Optional: script or ripgrep by candidate ID — manual pass is acceptable when systematic.

---

## Reviewer / bot comments

When review asks to “deduplicate” the owner map:

- Prefer narrowing rollup ranges and splitting rows over deleting candidate records.
- Do not change candidate evidence merely to match a wrong map — fix the map.
- Do not treat map cleanup as approval to mutate Linear ownership or create an issue.
- Group candidates only when disposition and matched/proposed owner state are genuinely identical.
