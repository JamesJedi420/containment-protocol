**Harvest retrofit (rich)** — `spatial-remodeling-faction-metadata-35` → **SPE-373** (part 1/1)
_Automated retrofit from `planning/spatial-remodeling-faction-metadata-35-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.
- **Dedup:** Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous factions), `alpha-centauri-manual-metadata-88` (`constructionProgress.ts`, `mapMetadata.ts`).
- **Repo at triage:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Candidates on SPE-373:** C4
---

#### C4 — Militarized service-company hierarchy

**1. Candidate & source**
- **ID:** C4
- **Batch:** `spatial-remodeling-faction-metadata-35`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Militarized service-company hierarchy
- **Pattern context:** Abstracted from batch source (Readable wiki group-hub pass (militarized renovation contractor / pitch-black humanoid work crews). Pattern-only — no imported setting names, employee labels, level IDs, proprietary tool names, uniform prose, or hub article graph.).
- **Repo anchor:** `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `src/domain/constructionProgress.ts`; `src/domain/siteGeneration/mapMetadata.ts`; `src/domain/branchContinuity.ts`; `architecture/artifact-mode-and-charge-states.md`; `authorityGraph` provenance/confidence; `faction_diplomacy` event channel.
- **Table note:** Militarized service-company hierarchy

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-373
- **Co-owners:** SPE-788

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-373 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `phenomena-hub-verified-metadata-58`, `covert-organization-field-catalog-metadata-83`, `covert-trust-intrigue-metadata-80`, `osr-emergent-fieldplay-metadata-60` (non-hostile hazardous fact…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/spatial-remodeling-faction-metadata-35-harvest.md` (C4)
