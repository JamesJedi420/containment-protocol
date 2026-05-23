**Harvest retrofit (rich)** — `osr-emergent-fieldplay-metadata-60` → **SPE-1034** (part 1/1)
_Automated retrofit from `planning/osr-emergent-fieldplay-metadata-60-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable design-article pass (emergent sandbox / rules-lite fieldplay principles). Pattern-only — no imported RPG names, article prose, fantasy encounter examples, or proprietary OSR terminology.
- **Dedup:** Supplements `tabletop-mechanics-transcript-metadata-87` (OSR agency, partial success), `field-staff-operations-handbook-metadata-105` (weather/season), `pulp-expedition-adventure-metadata-40` (travel legs), `sealed-facility-manual-metadata-95` (site routes), `campaign-readiness-mission-hub-metadata-96` (retreat partial success).
- **Repo at triage:** `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Candidates on SPE-1034:** C20
---

#### C20 — Open-ended action intent taxonomy

**1. Candidate & source**
- **ID:** C20
- **Batch:** `osr-emergent-fieldplay-metadata-60`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Open-ended action intent taxonomy
- **Pattern context:** Abstracted from batch source (Readable design-article pass (emergent sandbox / rules-lite fieldplay principles). Pattern-only — no imported RPG names, article prose, fantasy encounter examples, or proprietary OSR terminology.).
- **Repo anchor:** `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Table note:** Open-ended action intent taxonomy

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1034
- **Co-owners:** SPE-793

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1034 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87` (OSR agency, partial success), `field-staff-operations-handbook-metadata-105` (weather/season), `pulp-expedition-adventure-metadata-40` (travel …

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-emergent-fieldplay-metadata-60-harvest.md` (C20)
