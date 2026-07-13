# SPE-947 — Countermeasure ledger link (slice 1)

One-page implementation plan. Linear: [SPE-2605](https://linear.app/spectranoir/issue/SPE-2605/countermeasure-ledger-link-slice-1) (child under [SPE-947](https://linear.app/spectranoir/issue/SPE-947)). Next SPE-947-owned deferred row after shipped [SPE-2604](https://linear.app/spectranoir/issue/SPE-2604); [SPE-947](https://linear.app/spectranoir/issue/SPE-947) parent stays **Backlog**. Coordinate with [SPE-645](https://linear.app/spectranoir/issue/SPE-645) (link only); propagation graph stays [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965.

| Field               | Value                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2605 — Countermeasure ledger link (slice 1)](https://linear.app/spectranoir/issue/SPE-2605/countermeasure-ledger-link-slice-1) |
| **Status**          | **In Progress**                                                                                                                                                 |
| **Parent**          | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — hazardous content propagation and counter-memetic operations; stays **Backlog**                       |
| **Branch**          | `spe-947-countermeasure-ledger-slice-1`                                                                                                                         |
| **Base `main` SHA** | `0b661d6e`                                                                                                                                                      |

## Goal

Ship the smallest deterministic **countermeasure ledger-link** surface that records/resolves SPE-947 counter-memetic (or linked-registry) countermeasure attempts against authored SPE-645-style reliability classes — without inventing a full ward catalog, propagation graph, mid-week mutations, or marking SPE-947 Done. Child Done ≠ umbrella Done.

## Prerequisite (on `main` @ `0b661d6e`)

| Shipped                       | Anchor                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Uptake-gate evaluator         | [SPE-2570](https://linear.app/spectranoir/issue/SPE-2570) — `evaluateCounterMemeticUptakeGate` |
| Compact evaluator maps        | [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576)                                   |
| SPE-947 ↔ registry linkage    | [SPE-2602](https://linear.app/spectranoir/issue/SPE-2602) — authored bindings + read/compose |
| Pursuit-vector surface        | [SPE-2604](https://linear.app/spectranoir/issue/SPE-2604)                                   |
| Reliability-class vocabulary  | [SPE-645](https://linear.app/spectranoir/issue/SPE-645) — link only; do not rewrite umbrella |

## Ledger-link contract

- **Authored reliability ledger** — SPE-645-style classes (`false` / `partial` / `operative` / `narrow_context` / `high_confidence`) as compact entries; not a full ward catalog.
- **Authored bindings** — attempt (`counter_memetic_plan` | `linked_registry`) → reliability ledger id; ids only, no dual reliability truth.
- **Read/compose** — resolve attempt label + reliability class; for counter-memetic plans, surface SPE-2570 uptake readiness without changing the evaluator contract.
- **Empty / missing** — empty bindings → empty list; missing attempt or reliability id → flagged status without throw; no false parent AC.
- **CP-neutral labels** — reuse plan/registry/ledger labels only.

## Scope

| In                                                                      | Out                                        |
| ----------------------------------------------------------------------- | ------------------------------------------ |
| Pure `resolveSpe947CountermeasureLedgerLink` / `composeSpe947CountermeasureLedgerLinks` | Propagation graph / internet simulator |
| Focused Vitest: empty/no-op + authored counter-memetic path             | Evaluator contract changes (SPE-2568–2574) |
| Slice doc + backlog handoff                                             | Mid-week mutations                         |
|                                                                         | SPE-947 parent Done                        |
|                                                                         | Full SPE-645 ward / bypass / fragment AC   |
|                                                                         | SPE-956 propagation graph                  |

## Acceptance

- [x] Empty bindings / missing ledger ids resolve as no-op / unresolved without throw
- [x] One authored path yields a deterministic ledger-link reading (attempt + SPE-645-style reliability class)
- [x] Empty defaults do not falsely satisfy parent AC scenarios
- [x] Evaluator contracts (SPE-2568–2574) unchanged
- [x] No new mid-week mutations; no invented propagation graph or full ward catalog
- [x] CP-neutral labels only; no dual reliability truth
- [x] `npm run lint` + targeted tests green
- [ ] Parent SPE-947 stays **Backlog**; child Done only after merge

## Validation

- `npm.cmd run test:run -- src/test/spe947CountermeasureLedgerLink.test.ts`
- `npm.cmd run lint`

## Deferred

| Item                                   | Suggested owner         | Why deferred            |
| -------------------------------------- | ----------------------- | ----------------------- |
| Propagation graph wire-up              | SPE-956 / harvest #965  | Deferred since SPE-2111 |
| Full SPE-645 catalog / bypass / fragments | SPE-645              | Link only this slice    |
| Adaptation / commercialization kinds   | SPE-947 / SPE-1085      | Out of this slice       |
| Parent umbrella Done                   | Later SPE-947 reconciliation | Wire-up still open |

## See also

- `planning/spe-947-pursuit-vector-slice-1.md`
- `planning/spe-947-spe-2111-registry-linkage-slice-1.md`
- `planning/spe-947-counter-memetic-uptake-gate-slice-1.md`
- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/backlog.md`
