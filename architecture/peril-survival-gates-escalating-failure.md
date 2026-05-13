# Peril, Survival Gates, and Escalating Failure (SPE-115)

## Purpose

**Dangerous failure** raises a **compact peril track** (bounded meter) that can trigger **survival checks** with **worsening odds** over time — not only immediate death vs harmless failure.

## Peril track

- Increments on severe misses, environmental shocks, integrity breaches, or authored stressors.
- **Decays or plateaus** only when explicit recovery actions succeed (rest, medical ladder, extraction).

## Survival gates

When peril crosses thresholds, fire **survival checks** with:

- odds bands that **worsen** if prior gates were failed or ignored,
- **severe-loss escalators** that add extra peril or new consequence types beyond normal increments,
- optional **branching** into injury, capture, equipment loss, or clock jumps instead of binary death.

## Low-risk failures that escalate later

Some failures add **latent peril** or **hidden clock** without immediate pain — they should surface in **reports** when the later gate fires, with explanation tying back to the earlier choice.

## Player-facing explanation

Each survival trigger must emit a **cause code** and **human-readable reason** (“peril 4/6 from unchecked gas leak + round 3 shock”) so SPE-24-style surfaces stay honest.

## Integration

- **Medical ladder** — SPE-68 interacts when survival outcomes include trauma or stabilization windows.
- **Momentum** — SPE-89 may interact only where authored; do not let peril bypass integrity rules without explicit policy.

## See also

- `architecture/medical-stabilization-response.md` — SPE-68
- `architecture/momentum-scarce-mitigation-resource.md` — SPE-89
- `docs/visibility-layer-audit.md` — SPE-24
