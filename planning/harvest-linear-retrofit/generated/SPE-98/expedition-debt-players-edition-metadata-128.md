**Harvest retrofit (rich)** — `expedition-debt-players-edition-metadata-128` → **SPE-98** (part 1/1)
_Automated retrofit from `planning/expedition-debt-players-edition-metadata-128-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.
- **Dedup:** **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-rules surfaces.
- **Repo at triage:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Candidates on SPE-98:** C24, C84–C85
---

#### C24 — Damageable vehicles/structures/assets

**1. Candidate & source**
- **ID:** C24
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Damageable vehicles/structures/assets
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Damageable vehicles/structures/assets

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-98
- **Co-owners:** SPE-1052

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-98 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C24)

---

#### C84–C85 — Equipment bundles; org-binding debt origin

**1. Candidate & source**
- **ID:** C84–C85
- **Batch:** `expedition-debt-players-edition-metadata-128`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Equipment bundles; org-binding debt origin
- **Pattern context:** Abstracted from batch source (Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.).
- **Repo anchor:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.
- **Table note:** Equipment bundles; org-binding debt origin

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-98
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-98 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-ru…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/expedition-debt-players-edition-metadata-128-harvest.md` (C84–C85)
