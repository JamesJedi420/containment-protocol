# Local Confrontation Resolution with Odds Bands (SPE-73)

## Purpose

Adjacent or small-scale **confrontations** resolve through **calibrated result bands**, not binary pass/fail and not pure damage racing to zero HP. Outcomes allocate **delay, isolation, capture, suppression, or controlled violence** with **downstream staffing, morale, recovery, and evidence** effects.

## Odds band model

- **Pre-bands** — inputs aggregate into discrete probability-weight buckets (deterministically from seeded policy or pure state tables per product decision).
- **Result bands** — map bucket draws to **structured outcomes**: e.g., `delay+isolate`, `capture_clean`, `suppress_nonlethal`, `exchange_fire_partial`, `route_lost`.
- **Support aggregation** — defensive posture, cover, ally packages, and specialist overlays shift band weights — not a single “power number.”

## Reduced states and vulnerability layers

- **Reduced states** — pinned, dazzled, encircled, disarmed; alter which bands are legal next tick.
- **Vulnerability-layer targeting** — leadership, comms, mobility, or morale layers can be struck for nonlethal strategic effect.

## Compatibility-sensitive counters

Certain counters only apply when **doctrine, equipment tags, or faction rules** align; incompatible counters should **surface as wasted action** or reroute to partial bands deterministically.

## Nonlethal families

First-class nonlethal bands include **delay**, **isolate**, **capture**, **temporary suppression**, and **negotiated stand-down** — each with distinct follow-through hooks (clocks, evidence, legitimacy).

## Downstream consequences

Confrontation results must feed:

- **Injury burden** — operational injuries, not only fatalities.
- **Staffing / readiness** — SPE-29 attrition adjacency.
- **Morale and cohesion** — especially after messy or public outcomes.
- **Evidence chains** — what cameras, witnesses, or seized kit prove.

## Integration

- **Combat resolver** — `docs/combat-resolver-audit.md` for encounter-scale evaluation vs this doc’s **local adjacent-force** framing; keep grammar compatible where possible.
- **SPE-56** — non-core actors may refuse bands that imply excessive violence.

## See also

- `docs/combat-resolver-audit.md`
- `architecture/compliance-breakdown-non-core-actors.md` — SPE-56
- `systems/mission-resolution.md`
