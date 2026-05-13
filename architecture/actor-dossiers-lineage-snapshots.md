# Actor Dossiers, Lineage, and Snapshots (SPE-158)

## Purpose

Each actor record separates **identity-facing fields** from **operational state**, supports **lineage and kinship**, and can be **promoted** from low-depth to full dossiers while preserving continuity across incidents.

## Dual-surface model

- **Identity surface** — name stack, pronouns, title, lineage, kinship, public role, wealth band, civic status.
- **Operational surface** — readiness, certifications, trauma, obligations, access rights, trait tags relevant to systems.

Surfaces share a stable actor ID but can be stored, viewed, and trimmed independently.

## Lineage and kinship

Track:

- parentage, offspring, siblings, found family,
- house or patronage links,
- key inheritance hooks (SPE-148).

These feed succession, obligation, and faction behavior.

## Public vs hidden facts

Dossiers maintain:

- **public facts** — available to intel / hub surfaces,
- **hidden facts** — available only to adversaries, sponsors, or postmortem tools.

Hidden facts may later become public through events.

## Time-scoped snapshots

Snapshots capture state at key ticks:

- before major cases,
- after turning points,
- at succession or discharge.

Low-depth actors may initially store only a thin snapshot and later be **promoted** into fuller dossiers when they matter.

## Integration

- **Knowledge / intel (SPE-22, SPE-58)** — dossiers are consumers and sources of intel, not replacements.
- **Recruitment and inheritance** — actor records feed market and estate transfer systems.

## See also

- `architecture/inheritance-estate-transfer-registration.md` — SPE-148
- `docs/knowledge-intel-partial-information-audit.md`

