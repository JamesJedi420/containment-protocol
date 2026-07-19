# SPE-956 — Parent umbrella Done after SPE-2641 (owner acceptance)

One-page hygiene record. Linear: [SPE-2642](https://linear.app/spectranoir/issue/SPE-2642) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped [SPE-2641](https://linear.app/spectranoir/issue/SPE-2641); parent **Done** on merge (owner acceptance July 2026). Pattern: [SPE-2618](https://linear.app/spectranoir/issue/SPE-2618) / SPE-947 umbrella Done.

| Field               | Value                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2642 — SPE-956 parent umbrella Done after SPE-2641 (owner acceptance)](https://linear.app/spectranoir/issue/SPE-2642)              |
| **Status**          | **Shipped** — PR #3194 @ `4133bb07`                                                                                                                         |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; **Done** on this merge |
| **Branch**          | `spe-956-parent-umbrella-acceptance-slice-1`                                                                                            |
| **Base `main` SHA** | `e697dcbb`                                                                                                                              |

## Goal

Record explicit owner acceptance that the SPE-2641 AC matrix (7/7 **Yes** at incident-path / evaluator+EXAMPLE level) closes the SPE-956 parent umbrella. Mark SPE-956 **Done**. Update Linear parent body + backlog/handoff. Prefer Done over the week-close channel tick sibling.

## Prerequisite (on `main` @ `e697dcbb`)

| Shipped                          | Anchor                                                                                                      | PR    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----- |
| Parent AC matrix reconciliation  | [SPE-2641](https://linear.app/spectranoir/issue/SPE-2641) — 7/7 Yes; empty-map no-op recorded             | #3192 |
| Five-lane incident path          | [SPE-2639](https://linear.app/spectranoir/issue/SPE-2639) / [SPE-2640](https://linear.app/spectranoir/issue/SPE-2640) | #3188 / #3190 |
| SPE-947 umbrella Done pattern    | [SPE-2618](https://linear.app/spectranoir/issue/SPE-2618) — Linear-only owner acceptance                  | #3137 |

**Delta:** After SPE-2641, SPE-956 deferred still listed parent umbrella Done as an owner gate. Preferred path: accept 7/7 Yes as umbrella closure. Week-close channel tick and GameState incident baseline persistence remain optional post-Done siblings (not AC blockers).

## Owner acceptance

**Decision (July 2026):** Prefer umbrella **Done** over week-close channel tick orchestration.

**Gate:** SPE-2641 matrix is **7/7 Yes** at incident-path / evaluator+EXAMPLE level. That evidence bar **closes** SPE-956. Empty `{}` maps still no-op and must not false-satisfy — already recorded on SPE-2641; not reopened here.

**Pattern:** SPE-2618 / SPE-947 — Linear-only owner acceptance; optional deferred siblings do not block Done.

## Parent [SPE-956](https://linear.app/spectranoir/issue/SPE-956) disposition

**Done** on SPE-2642 merge — owner accepts 7/7 AC Yes as full parent acceptance. Optional week-close tick and baseline persistence may still be opened later as non-blocking follow-ons; they are not SPE-956 AC rows.

## Scope (this slice)

| In                                                                                          | Out                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Owner acceptance comment + SPE-956 body status for umbrella Done                            | Week-close channel tick                          |
| Mark SPE-956 **Done** on merge (Linear-only)                                                | GameState incident baseline persistence          |
| Slice doc (this file) + `planning/backlog.md` / handoff manifest                            | Evaluator / mirror / `src/` runtime changes      |
| Mark SPE-2641 / matrix slice **Shipped** in backlog + manifest                              | Inventing new AC rows                            |
| Deferred refresh: optional siblings remain non-blocking; SPE-1682/860/911/875 stay out      | SPE-1682 / 860 / 911 / 875 expansions            |
| Update `planning/spe-956-parent-ac-matrix-reconciliation-slice-1.md` deferred / status      | Rewriting SPE-2639/2640 path                     |

## Acceptance

- [x] Owner acceptance recorded: 7/7 SPE-2641 matrix Yes closes SPE-956 umbrella
- [x] SPE-956 Linear status **Done** on merge; deferred table marks umbrella Done accepted
- [x] Slice doc + backlog handoff present; SPE-2641 → recently shipped
- [x] `npm run verify:backlog-handoff` green; no `src/` domain/runtime changes
- [x] Child Done only after merge

## Deferred

| Item                                    | Suggested owner                               | Why deferred                                                                 |
| --------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| Week-close channel tick                 | [SPE-2643](https://linear.app/spectranoir/issue/SPE-2643) | Post-Done orchestration sibling; does not reopen AC |
| GameState incident baseline persistence | Optional post-Done sibling                    | Baselines remain authored inputs on SPE-2639/2640 path                       |
| Parent umbrella **Done**                | **Done** — owner acceptance July 2026         | SPE-2642 disposition; 7/7 AC Yes at incident-path / evaluator+EXAMPLE        |
| SPE-1682 / 860 / 911 / 875 expansions   | Those parents                                 | Explicitly out of SPE-956 matrix boundary                                    |

## Validation

Docs/hygiene only — no new domain tests.

- `npm run verify:backlog-handoff`

## See also

- `planning/spe-956-parent-ac-matrix-reconciliation-slice-1.md`
- `planning/spe-947-parent-umbrella-reconciliation-slice-2.md`
- `planning/spe-956-parent-ac-incident-wire-up-slice-1.md`
- `planning/spe-956-parent-ac-incident-wire-up-slice-2.md`
- `planning/backlog.md`
