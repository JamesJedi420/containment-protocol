# SPE-2720 — Authority graph week-close persistence slice

Parent: SPE-788 — Authority relationship graph and politics layer

| Field      | Value                                                                            |
| ---------- | -------------------------------------------------------------------------------- |
| **Status** | **Shipped**                                                                      |
| **Branch** | `jamesdyedbq/spe-2720-persist-deterministic-authority-graph-mutation-history-at` |

## Goal

Establish the smallest persisted authority-graph state foundation and one deterministic,
bounded, consequence-driven graph mutation at week-close. This slice does not implement the
broader politics layer.

## Boundary

- Persist an authority graph, a same-week idempotency marker, and bounded mutation history.
- Normalize missing or malformed persisted state during hydration/run transfer.
- At week-close, choose one eligible edge in code-unit ID order, resolve its existing authority
  consequence, and clamp the resulting edge-strength movement to five points.
- Retain at most 52 mutation-history entries.
- Keep the feature graph-local and no-op for missing or empty graphs.

## Acceptance

- Identical graph state and week produce an identical mutation and history entry.
- A repeated application for the same week produces no duplicate mutation or history.
- History retains only the newest 52 valid weeks.
- Hydration drops malformed nodes, edges, history, and unmatched idempotency markers safely.
- Existing authority negotiation results remain unchanged.
- Market/commerce and operational-cover behavior remain unchanged.

## Reuse

- `resolveAuthorityGraphConsequences`
- authority graph validation and fixtures
- `advanceWeek` post-report week-close orchestration
- `hydrateGame` normalization conventions

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Broader relationship politics, department/council behavior, and authority UI | SPE-788 or a new child | This slice establishes persistence and one mutation only; it does not define a politics simulation or presentation contract. |
| Mission routing, ethics/obedience, and command propagation effects | Separate children under their owning systems | Coupling the new graph directly into operational decisions would exceed the graph-state foundation boundary. |
| Secrecy and media consequences | Existing secrecy/media owners | Those systems require their own explicit consequence mapping and acceptance criteria. |
| Ranking, rival pressure, interference, upkeep, and operational-cover math | SPE-39 children | SPE-2720 deliberately keeps graph mutation independent of SPE-39 calculations. |
