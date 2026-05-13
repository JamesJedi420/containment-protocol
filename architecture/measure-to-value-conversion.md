# Measure-to-Value Conversion Rules (SPE-152)

## Purpose

Authored measures (weight, distance, speed, lift, etc.) convert through **shared reusable bands / formulas**, not bespoke subsystem math scattered across features.

## Shared conversion contracts

Define stable conversions for:

- **Weight** → carry burden, vehicle capacity, fatigue cost
- **Distance** → travel weeks, pursuit band transitions, spotting likelihood
- **Speed** → chase deltas, interception odds
- **Lift / force** → breach feasibility, siegeworks damage bands

## Bands and caps

Use bounded categories with caps:

- “light / medium / heavy / overcapacity”
- “near / mid / far / beyond”

Caps prevent degenerate stacking and simplify validation and UI explanation.

## Multi-input derived values

Derived operational values can depend on multiple inputs:

- speed + terrain + slope → travel cost (SPE-142),
- lift + tool + material → breach band (SPE-108),
- weight + fatigue + concealability → pursuit vulnerability (SPE-90).

## Integration

Consumers must reference shared conversion helpers (or a single tuning table) so the same measures mean the same thing across routing, resolution, and reports.

## See also

- `architecture/macro-travel-long-range-spotting.md` — SPE-142
- `architecture/pursuit-chase-transit-hazards.md` — SPE-90
- `architecture/siegeworks-fortification-destruction-tunnels.md` — SPE-108

