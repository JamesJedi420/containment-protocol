# District Scheduling, Urban Cadence, and Witness Density (SPE-109)

## Purpose

**Districts** use **deterministic time-band profiles** for traffic, witness density, and encounter pressure — not one settlement-wide day/night boolean.

## Time bands

Author **named bands** per district (e.g., `dawn_commute`, `market_peak`, `late_evening`, `curfew_thin`) with:

- baseline **public traffic** weight,
- **witness density** multiplier,
- **event / encounter family** weights,
- **silence / discretion** windows where certain actions gain stealth bonuses or lose witness risk.

Bands advance on the **weekly or sub-weekly cadence** the campaign mode defines; transitions are deterministic from clocks and policy.

## Baseline plus rare overlays

- **Baseline traffic** — stable profile for ordinary weeks.
- **Rare overlays** — festivals, strikes, raids, weather events, or anomaly bleed that temporarily replace or multiply band weights.

## District-specific encounter weighting

The same global encounter table may map to **different draw weights** per district tag (industrial dock vs embassy row vs underground mall).

## Witness-collapse stealth windows

When witness density drops below authored thresholds (blackout, curfew, riot dispersal), open **witness-collapse windows** where certain covert or violent actions produce fewer public consequences — bounded duration with follow-up investigation risk.

## Segmented day-part cadence

Split the day into **segments** for action scheduling (permits valid only in segment X, shop access in segment Y) rather than a single night flag.

## Integration

- **Urban service nodes (SPE-86)** — clientele and rumor outputs shift with band.
- **Case generation** — `getDistrictScheduleWeightBonus` style hooks consume district + band keys.

## See also

- `architecture/district-aware-urban-encounter-generation.md` — SPE-139
- `architecture/urban-service-nodes-legal-front-hidden-function.md` — SPE-86
- `docs/case-generation-audit.md`
- `architecture/civic-jurisdiction-detention-unrest.md` — SPE-87
