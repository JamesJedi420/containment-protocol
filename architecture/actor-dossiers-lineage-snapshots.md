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

## Implemented institutional helper (SPE-2095)

`src/domain/actorDossier.ts` defines the slice-1 record, dated patch snapshots, per-field projection and sparse Agent adapter. Actor IDs remain canonical local IDs. Roles distinguish staff, field operatives, former personnel, persons of interest, external actors, contained people, artificial systems and disputed identities. Fields are institutional projections rather than a second owner for vitals, assignment resolution or access grants.

Each supplied field carries confidence, provenance and an explicit clearance/need-to-know policy. Both policy conditions must pass; missing or malformed access fails closed. Redaction drops values and provenance. Unknown or absent values remain unavailable; supported/uncertain evidence remains estimated. Callers must authorize record existence and ID disclosure before projection. The adapter accepts sparse legacy Agents, returns null without a valid ID, prefers canonical identity names, copies assignment state without resolving it and invents no clearance, career credit or historical baseline. Without an explicit caller-supplied access policy, adapted fields remain redacted.

`appendActorDossierSnapshot` appends a caller-supplied dated patch and applies it to the current institutional fields. Callers explicitly capture an initial baseline when historical values are required. Older patches are preserved; backdated appends reject. A snapshot is a patch, not a reconstructed complete record: its projection never fills omissions from current state. Snapshot existence/date/reason require their own access policy, and each patch field also retains its own policy. This is an immutable helper, not a persisted history ledger or snapshot-generation hook.

Optional career summaries require supplied event/contribution references and provenance; no roster-based attribution is performed. Shared release/relation revision references and persona links are read-only, clearance-gated metadata supplied by their canonical owners. They grant no access, create no actors, and do not materialize kinship into chemistry or participation into service credit. Release-scoped names/aliases can be supplied as ordinary source-qualified fields without changing the local actor ID. Visible alias/name collisions produce deterministic warnings, never merges; hidden names do not participate.

The optional typed player annotation is separately projected, bounded to 1,600 characters and never folded into canonical facts or history. No default note is fabricated. `src/test/actorDossier.test.ts` covers the contract using constructed fixtures; live registry, UI, save/edit flows and gameplay evidence remain with their existing owners. Parent SPE-158 remains open for its broader lineage/wealth/integration acceptance. SPE-2736 can consume this record alongside SPE-382 compact cards without duplicating dossier ownership.

Multiple snapshots may share a week: array append order is the authoritative ordering within that week, and each patch retains its reason. A week is a coarse time anchor, not a unique snapshot ID. SPE-2095 does not authorize dropping legitimate same-week institutional changes. Targeted coverage records an initial service snapshot and a later assignment patch in the same week, preserving both and applying the later patch only to current fields.
