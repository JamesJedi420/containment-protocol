# Persistent Hidden Search and Diminishing Retries (SPE-136)

## Purpose

**Hidden content** survives **failed searches**. Each attempt consumes **explicit time** and may **degrade** later success odds or **quality** of what is found. **Claimed** hidden objects **cannot** respawn or be “rediscovered” under the same cache identity.

## Persistence rules

- **Undiscovered state** remains in canonical site or room records after a failed probe — no silent deletion.
- **Claimed / extracted** objects transition to custody chains; the **slot** may empty but history prevents duplicate spawns without authored reset events.

## Attempt costs

- Every search action spends **clock time**, **fatigue** (SPE-130), or **specialist slots** depending on modality.
- **Room-feature-targeted** searches (floorboards, HVAC, altar seam) declare eligible features so retries cannot spam the whole room for free.

## Diminishing retries

Repeated attempts on the same target without new intel:

- lower **odds** of clean extraction,
- increase **damage / contamination** (degraded salvage),
- or raise **detection / clock pressure** (witnesses, alarms).

Degradation must be **deterministic** from attempt count + tools + skill.

## Hidden caches

Caches have **separate identity** from loose loot: partial reveals may show *presence* without *contents* until a final successful pass.

## Integration

- **SPE-135 room layers** — hidden layer hosts undiscovered records.
- **SPE-112 briefing** — may hint that retries exist without revealing coordinates.

## See also

- `architecture/structured-room-key-records.md` — SPE-135
- `architecture/pre-mission-query-budgets-briefing-intel.md` — SPE-112
- `architecture/hidden-state-displacement-counter-detection.md` — SPE-70
