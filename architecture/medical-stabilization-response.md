# Stabilization Ladders and Tiered Medical Response (SPE-68)

## Purpose

**Impairment and treatment** are **staged**, **consequence-family-dependent**, and **resource-gated** — not a generic “heal to full” reset. This doc defines the ladder semantics the simulation should expose consistently across missions, downtime, and reports.

## Treatment ladder (conceptual)

Progression is generally:

1. **Immediate stabilization** — keep the casualty viable inside the current tick or phase (airway, bleed control, containment of spread).
2. **Harmful-agent neutralization** — antidote, chelation, ritual severance, decon, or power bleed-off as the threat family requires.
3. **Function restoration** — surgery, grafts, prosthetics, anomaly-stabilized tissue, or cognitive rehab that returns *capability bands*.
4. **Long-tail recovery** — fatigue, trauma, reconditioning, and readiness gates (ties to `docs/recovery-trauma-downtime-audit.md`).

Different **consequence families** (burn, occult taint, neuro shock, radiation, possession-adjacent stress) swap or extend ladder steps but keep the **same outer contract**: staged, inspectable, deterministic transitions.

## Operational details

- **Shock windows** — downed agents have finite deterministic windows before ladder steps lock or degrade outcomes.
- **Consumable treatment kits** — bounded stock items that unlock specific ladder transitions or shorten clocks.
- **Proficiency-gated first response** — certifications / training gates for who may attempt which stabilization tier without automatic failure.
- **Intensive care resource states** — bed/ventilator/ritual-circle throughput caps concurrent critical cases.
- **Supportive vs definitive care** — supportive care sustains or slows deterioration; definitive care resolves the underlying step when prerequisites exist.
- **Non-instant revival** — rare revival paths require multi-week investment, scarce inputs, and explicit risk bands; they are not menu spam.

## Integration

- **Readiness / deployment** — unresolved ladder steps block or soften deployment categories.
- **Weakest-link** — medical collapse can be the limiting link under authored missions.
- **Evidence / legitimacy** — mistreatment or experimental care creates reportable fallout.

## Anti-patterns

- One-step “med bay clears all.”
- Hidden full heals that bypass recovery and attrition systems.

## See also

- `docs/recovery-trauma-downtime-audit.md`
- `systems/team-management.md`
- `systems/mission-resolution.md`
