# Compound Analysis, Antidote, and Consumable Specialist Lane (SPE-82)

## Purpose

**Compounds** (toxins, reagents, anomaly vectors, hybrid chems) form a **single explicit specialist lane** spanning identification, route hazard assessment, antidote prep, and **bounded consumable synthesis** — not “crafting menu + medkit” split across unrelated systems.

## Lane responsibilities

- **Heuristic identification** — field tests, colorimetric strips, ritual sniffers: bounded accuracy with false-positive/false-negative tables.
- **Route-specific hazard assessment** — same compound behaves differently by ingress, weather, or PPE state (`architecture/spatial-layers-exposure.md`).
- **Cumulative toxin burden** — sublethal stacks that change bands before lethal thresholds.
- **Partial neutralization** — buys time without clearing the hazard; may shift confrontation odds (`architecture/local-confrontation-odds-bands.md`).
- **Narrow vulnerability counters** — specific chemical, thermal, or ritual windows for classes that **ignore ordinary weapons**.
- **Consumable production gates** — lab tier, doctrine sign-off, ingredient scarcity, and week throughput caps.

## Ineffective attack escalation

Using the **wrong counter** can **escalate** the hazard (accelerate clock, widen splash, anger symbiotic entities). Failures must be **source-tagged** in reports.

## Integration

- **Medical ladder** — `architecture/medical-stabilization-response.md` consumes compound state for neutralization and recovery steps.
- **SPE-85 outsourcing** — external labs may synthesize with hidden quality bands.

## See also

- `architecture/medical-stabilization-response.md` — SPE-68
- `architecture/specialist-outsourcing-transcription-flawed-output.md` — SPE-85
- `architecture/supply-network-strategic-nodes.md` — SPE-72
