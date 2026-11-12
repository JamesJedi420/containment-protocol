# SPE-2721 — Persisted authority graph negotiation slice

Parent: SPE-788 — Authority relationship graph and politics layer

| Field      | Value                                                                               |
| ---------- | ----------------------------------------------------------------------------------- |
| **Status** | **Shipped**                                                                         |
| **Branch** | `jamesdyedbq/spe-2721-consume-persisted-authority-graph-in-one-bounded-negotiation` |

## Goal

Consume the persisted authority graph through one existing deterministic negotiation path.
This is a read-only runtime integration slice, not a broader politics layer.

## Boundary

- Add one GameState-shaped read seam that sanitizes `authorityGraphState` and passes its graph
  to the existing authority negotiation resolver.
- Reuse existing alias resolution, consequence resolution, ordering, and empty-result behavior.
- Preserve negotiation purity and the existing week-close mutation schedule.
- Keep market, operational cover, UI, command propagation, department/council politics,
  secrecy/media, commerce, and SPE-39 math unchanged.

## Acceptance

- A persisted dependency edge changes one negotiation from the empty fallback to the existing
  partial-cooperation outcome.
- Node aliases resolve through the persisted graph.
- Missing, malformed, and legacy graph state use the existing empty-graph fallback.
- Repeated resolution is deterministic and does not mutate persisted graph state.
- Week-close mutation, market access, and operational cover retain their existing behavior.

## Reuse

- `sanitizeAuthorityGraphState`
- `resolveAuthorityNegotiation`
- `resolveAuthorityGraphConsequences`
- authority node alias normalization and consequence ordering

## Schema

No persisted shape changes. `GameState.authorityGraphState` retains the SPE-2720 contract in
`SCHEMA_REGISTRY.md`.

## Deferred

| Item                                                | Suggested owner           | Why deferred                                                           |
| --------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| Command propagation and department/council politics | Separate SPE-788 children | They require new behavior and ownership contracts beyond a graph read. |
| Secrecy, media, and broader faction runtime effects | Their existing owners     | This slice does not map negotiation consequences into those systems.   |
| Commerce and SPE-39 calculations                    | Economy and SPE-39 owners | Authority negotiation remains isolated from market and cover math.     |
