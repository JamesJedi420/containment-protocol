# Regional Exchange, Bargaining, and Currency Fragmentation (SPE-172)

## Purpose

Realized transaction value differs from baseline value due to **regional variance**, **bargaining**, **market power**, **fragmented currencies**, **sanctions**, and **supplier dependence**. Prices are **signals**, not fixed truths.

## Baseline vs realized price

- **Baseline market value** — reference price anchored in economy tuning.
- **Realized local price** — result of region, bargaining outcome, and overlays.

Keep them separate in docs and data; never overwrite baseline with realized.

## Fragmented currencies and conversion

Multiple currencies exist with:

- variable **acceptance**,
- **conversion loss** and fees,
- **sanction flags**.

Conversion decisions encode risk: holding illiquid or sanctioned currency is itself information.

## Bargaining and power

Realized price depends on:

- buyer and seller alternatives,
- reputation, legitimacy, and leverage,
- urgency and scarcity.

## Supplier concentration

Few suppliers mean:

- higher pricing power,
- higher exposure to disruption,
- and fewer options under sanctions.

## Integration

- **Procurement and budget pressure (SPE-28)** — feeds funding and backlog docs.
- **Regional settlement and polity docs (SPE-144)** — local economies shape surfaces.

## See also

- `docs/funding-procurement-budget-pressure-audit.md` — SPE-28
- `architecture/polity-driven-settlement-generation.md` — SPE-144
- `architecture/civic-jurisdiction-detention-unrest.md` — SPE-87 (sanctions, permits, and enforcement affecting trade and liquidity)

