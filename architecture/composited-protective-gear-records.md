# Composited Protective Gear Records (SPE-145)

## Purpose

**Armor and PPE** are **composed records** — garment + material family + reinforcement pattern + coverage style — not a single defense stat row.

## Composition slots

| Slot | Role |
| --- | --- |
| **Garment** — base cut (coverall, vest, robes, wetsuit). |
| **Material family** — textile, ceramic plate, occult weave, hazmat film. |
| **Reinforcement pattern** — riveted, laminated, spaced composite, ritual stitch grid. |
| **Coverage style** — partial, full, sealed, CBRN-over-cloth layering rules. |

## Secondary behaviors

- **Noise** — clank, rustle, slosh affects stealth and urban encounters.
- **Concealability** — bulk under civ clothes; law enforcement attention.
- **Environment fit** — heat/cold, water, vacuum, biohazard seal integrity.
- **Charges / mode switching** — powered plates, rebreather minutes, ward phases.
- **Don / doff friction** — time and assistance requirements; matters in pursuit and medical rescue.

## Threat-specific interaction

Tables map **threat tags** (acid, psi, blunt, blessed) to **modifier channels** — not one DR number.

## Localized body-region damage

Compatibility hooks for **region hits** (helm bypass, greave weak) without a full anatomy sim — use bounded region tags.

Canonical region identifiers live in `src/domain/bodyRegion.ts` (**SPE-120** vocabulary ownership: IDs and coverage-group expansion only). Localized hit selection, layered protection resolution, and injury aftermath remain SPE-120 follow-on work.

## Wearable layer × region compatibility (SPE-3394)

Simultaneous worn protective equipment is legal when occupied wearable layers and covered body regions do not both overlap.

| Concept | Owner | Module |
| --- | --- | --- |
| Wearable layer IDs (`skin` / `under` / `mid` / `shell` / `outer`) | SPE-3394 | `src/domain/wearableCompatibility.ts` |
| Covered body/exposure region IDs + coverage groups | SPE-120 | `src/domain/bodyRegion.ts` |
| Occupancy authoring on definitions | SPE-3394 (optional field) | `EquipmentDefinition.wearableOccupancy` |
| Assignment rejection | SPE-2828 / SPE-2840 path | `validateAgentLoadoutAssignment` |

Rules:

- Conflict when occupied-layer sets intersect **and** covered-region sets intersect.
- Multi-layer items reserve every declared layer across every declared covered region for the check.
- Same-layer disjoint regions remain compatible; same-region different layers remain compatible.
- Definitions without `wearableOccupancy` keep legacy assignment behavior.
- Preset application (SPE-3078) and UI consume typed `wearableConflicts` from canonical validation — they must not recompute overlap locally.

## Integration

- **SPE-113 mutation stations** — alter material or reinforcement while preserving identity.
- **Loadout validation** — `docs/gear-loadouts-audit.md`.

## See also

- `architecture/permanent-gear-mutation-stations.md` — SPE-113
- `docs/gear-loadouts-audit.md`
- `architecture/local-confrontation-odds-bands.md` — SPE-73
