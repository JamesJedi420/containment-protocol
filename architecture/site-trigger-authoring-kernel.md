# Preplaced Site Trigger Families — Authoring Kernel (SPE-71)

## Purpose

Site triggers are **reusable packets**, not a grab bag of one-off room tricks. Author them through **four stable axes** so validation, tooling, and cross-mission reuse stay tractable.

## Four axes (required fields conceptually)

| Axis | Question |
| --- | --- |
| **Surface** | What player or system channel arms the trigger (movement, interaction, scan, damage, clock, faction signal). |
| **Origin** | What entity or template owns the trigger (fixture, zone, guardian, environmental system). |
| **Onset** | When it fires (immediate, deferred, cumulative threshold, conditional latch). |
| **Outcome** | What deterministic state changes apply (spawn, transform, damage, illusion, reinforcement call, clock jump). |

## Onset families

- **Deferred onset** — fires after delay, line-of-sight, or prerequisite flags without hidden RNG.
- **Cumulative triggers** — pressure meters, visit counts, or damage buckets crossing thresholds.
- **Guardian-release containers** — boss or ward must exit state *X* before contents activate.
- **Decor-to-hostile conversion** — benign mesh flips to hostile template on authored condition.
- **Zone-scale illusion shells** — bounded mis-map of geometry or labels until dispelled.
- **Triggered reinforcement** — pulls from finite pools per `architecture/site-occupancy-repopulation.md`.

## Child routing

**Deceptive topology**, impossible-geometry overrides, and non-Euclidean room exceptions belong in **their child issues** — keep this kernel focused on **packet shape, onset grammar, and outcome routing**, not bespoke weird-space engines.

## Integration

- **Event / flag language** — reuse shared condition evaluators (`docs/trigger-system-audit.md`).
- **Cross-scale** — triggers that spawn campaign-level follow-ups must serialize through explicit packets (`docs/cross-scale-integration.md`).

## See also

- `docs/trigger-system-audit.md`
- `architecture/site-occupancy-repopulation.md` — SPE-61
- `SCHEMA_REGISTRY.md` — structured definition governance (SPE-47)
