**Harvest retrofit (rich)** — `governance-bureau-faction-metadata-82` → **SPE-626** (part 1/1)
_Automated retrofit from `planning/governance-bureau-faction-metadata-82-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable wiki faction-hub pass (law-and-order administrative bureau with branches, ethics committee, field sections, security contractor). Pattern-only — no imported setting names, character roster, proprietary classification acronyms, level IDs, or hub prose.
- **Dedup:** Supplements `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `phenomena-hub-verified-metadata-58`, `street-contact-dossier-metadata-51`, `field-staff-operations-handbook-metadata-105`, `alpha-centauri-manual-metadata-88`.
- **Repo at triage:** `systems/factions-legitimacy.md`; `src/domain/civilization.ts` (taboos, doctrine); `authorityGraph` confidence/provenance; `architecture/anomaly-compendium-governed-taxonomy.md`; `architecture/background-packages-inherited-start-state.md`; `teamComposition` / recruitment substrates.
- **Candidates on SPE-626:** C41
---

#### C41 — Contract reward scaling

**1. Candidate & source**
- **ID:** C41
- **Batch:** `governance-bureau-faction-metadata-82`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Contract reward scaling
- **Pattern context:** Abstracted from batch source (Readable wiki faction-hub pass (law-and-order administrative bureau with branches, ethics committee, field sections, security contractor). Pattern-only — no imported setting names, character roster, proprietary classification acronyms, level IDs, or hub prose.).
- **Repo anchor:** `systems/factions-legitimacy.md`; `src/domain/civilization.ts` (taboos, doctrine); `authorityGraph` confidence/provenance; `architecture/anomaly-compendium-governed-taxonomy.md`; `architecture/background-packages-inherited-start-state.md`; `teamComposition` / recruitment substrates.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `systems/factions-legitimacy.md`; `src/domain/civilization.ts` (taboos, doctrine); `authorityGraph` confidence/provenance; `architecture/anomaly-compendium-governed-taxonomy.md`; `architecture/background-packages-inherited-start-state.md`; `teamComposition` / recruitment substrates.
- **Table note:** Contract reward scaling

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-626
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-626 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `phenomena-hub-verified-metadata-58`, `street-contact-dossier-metadata-51`, `field-staff-operations-ha…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/governance-bureau-faction-metadata-82-harvest.md` (C41)
