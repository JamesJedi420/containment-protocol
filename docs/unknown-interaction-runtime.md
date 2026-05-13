# Unknown Interaction Runtime (SPE-59)

## Purpose

This layer governs **what happens when the player or system acts before classification is complete**. It is **not** the full knowledge-state model (see `architecture/knowledge-state-system.md`, SPE-58); it is the **runtime contract** for encounters, procedures, or sites whose **true type** is still uncertain.

## Core behaviors

- **Act under partial understanding** — deployment, probes, containment moves, and dialogue-adjacent choices may begin with explicit unknowns.
- **Deterministic reveal** — truth surfaces through bounded channels, for example:
  - **Contact** — first physical or sensory engagement updates encounter identity.
  - **Failure** — a mispredicted procedure back-reveals properties of the target.
  - **Analysis** — lab, SIGINT, or ritual decode promotes provisional labels.
  - **Containment** — success or partial lock may confirm or refute threat class.

## Provisional vs confirmed identity

Maintain **two tracks**:

1. **Provisional encounter identity** — what the runtime uses for modifiers, art placeholders, and player-facing copy *this tick* (“unknown bioform,” “possible Class-II ingress”).
2. **Confirmed true-state classification** — what the simulation commits to for downstream spawning, research gates, and legal fallout.

Promotion from (1) to (2) must be **logged and deterministic** from state + action + config — not silent retroactive edits without traceability.

## Explanation surfaces

UI and reports should retain **what was uncertain at decision time** even after reveal, so postmortems and legitimacy reviews remain fair. Do not overwrite provisional reasoning with only final labels.

## Integration

- **Encounter / case resolution** consumes provisional identity until reveal events fire.
- **Knowledge state (SPE-58)** receives promoted facts into interpreted/agency-known layers.
- **Weakest-link and readiness** may key off “confidence in encounter class” as an explicit input.

## See also

- `architecture/knowledge-state-system.md`
- `docs/combat-resolver-audit.md`
- `docs/visibility-layer-audit.md`
