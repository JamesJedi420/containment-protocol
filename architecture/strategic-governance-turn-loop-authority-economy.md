# Strategic Governance Turn Loop and Authority Economy (SPE-168)

## Purpose

Campaign-level governance runs through **explicit ordered phases** with **authority** and **money** as **separate capped channels**, plus persistent governance states and fortification erosion across turns.

## Turn loop (conceptual)

1. **Event intake** — incidents, petitions, faction demands, crises.
2. **Resource intake** — taxes, tribute, aid, trade flows.
3. **Maintenance** — upkeep, wages, fortification repair, institution sustain.
4. **Actions** — edicts, deployments, construction, reforms.
5. **War / occupation effects** — attrition, unrest, legitimacy shifts.

Each phase has deterministic ordering and integration hooks.

## Authority vs money

- **Authority** — abstract political and doctrinal capacity to enforce decisions; capped, spent, and regained separately from funds.
- **Money** — currency and material budget; can exist without authority and vice versa.

Decisions may consume either, both, or neither; docs should avoid conflating them.

## Governance states

Governance may be:

- stable,
- strained,
- emergency (SPE-147),
- occupation,
- or collapse.

States persist across turns and modulate which actions are legal or effective.

## Fortification erosion

Over time and under campaign pressure, fortifications degrade:

- damage not repaired,
- logistic overuse,
- political decisions to defund walls.

This erosion is tracked explicitly, not implied only at battle time.

## Variants

- **City-state primacy** — single urban center dominates; rural governance is thin.
- **Mobile courts** — authority rides with itinerant centers that move across regions.

## See also

- `architecture/emergency-governance-crackdown-states.md` — SPE-147
- `architecture/siegeworks-fortification-destruction-tunnels.md` — SPE-108
- `architecture/polity-driven-settlement-generation.md` — SPE-144
- `architecture/civic-jurisdiction-detention-unrest.md` — SPE-87 (enforcement layering, unrest, and coercive ladders under governance)

