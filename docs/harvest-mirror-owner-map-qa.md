# Harvest mirror — primary owner map QA

**Purpose:** Prevent PR review churn from **Primary owner map** rows that disagree with **Per-candidate outcomes**. Run on every `planning/*-harvest.md` before commit and on mirror PRs when review bots flag inconsistencies.

**Workflow context:** [`docs/harvest-candidate-triage-agent.md`](./harvest-candidate-triage-agent.md)

---

## Rule (authoritative table wins)

1. **Per-candidate outcomes** (`Owner(s)` column) is **authoritative** for SPE-#### assignment.
2. **Primary owner map** is a rollup for navigation. Every `SPE-####` in a candidate’s **Owner(s)** must appear on a map row that lists that candidate ID (alone or in a range).
3. Map rows must **not** assign a candidate to an SPE that does not appear in that candidate’s **Owner(s)** column.
4. **Do not** list the same candidate on two map rows with **different** primary SPE sets unless the detail row lists **all** of those SPEs as co-owners (e.g. `SPE-16, SPE-854` on both map and table).

---

## Common failures (fix before PR)

| Failure | Example | Fix |
| ------- | ------- | --- |
| Wrong SPE on map | C48 → `SPE-1653` on map but table has `SPE-1101, SPE-130` | Align map to table owners |
| Candidate on wrong rollup row | C94 on `SPE-68, SPE-130` but table has `SPE-1085, SPE-1101` | Move C94 to a row whose SPEs match the table |
| Duplicate ID, divergent owners | C48 on both `SPE-2095` rollup and `SPE-88, SPE-158` with different implied primaries | Keep one row; map SPEs must match table |
| Phantom owner | `SPE-1064` on map, never in any **Owner(s)** | Remove from map |
| no_op owner drift | C14 map lists `SPE-2105` only; table says `SPE-88, SPE-2106` | Map row SPEs = table SPEs for that ID |
| Grouped range hides mismatch | `C47–C48` on map but C48 table owners differ from C47 | Split range or narrow to IDs that share the same owner set |

---

## PR checklist (mirror doc)

- [ ] Every candidate ID **C1…Cn** appears in exactly one outcome row (or explicit grouped row `C31–C32` with same owners).
- [ ] For each row, every **Owner(s)** SPE appears on the primary owner map for that ID.
- [ ] No map row lists a candidate ID whose **Owner(s)** omits one of the SPEs on that map line.
- [ ] **no_op** and **contradiction_check** rows: map still reflects table owners (not “guardrails-only” shorthand that drops co-owners).
- [ ] Adjudication counts match table (fold-in / no-op / contradiction / new child).
- [ ] Dedup section IDs do not contradict per-candidate owners.
- [ ] Index row in `harvest-reconciliation-index.md` not added until this file exists at the same revision.

---

## Quick verification (agent)

For each candidate ID in the outcome tables:

1. Read **Owner(s)** from the table.
2. Find map row(s) containing that ID.
3. Confirm the union of SPE-#### on those map rows equals the table owner set (order irrelevant).
4. If multiple map rows list the same ID, confirm the table lists **all** SPEs from those rows as co-owners.

Optional: script or ripgrep by candidate ID — manual pass is acceptable for large batches if systematic.

---

## Reviewer / bot comments

When review asks to “deduplicate” the owner map:

- **Prefer** narrowing rollup ranges and splitting rows over deleting table rows.
- **Do not** change per-candidate **Owner(s)** to match a wrong map — fix the map.
- Grouped candidates (`C13–C23`) are allowed only when **every** ID in the range shares the **same** **Owner(s)** set; otherwise split the range in the map.
