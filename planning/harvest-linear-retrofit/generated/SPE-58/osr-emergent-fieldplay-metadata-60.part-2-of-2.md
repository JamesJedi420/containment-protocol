**Harvest retrofit (rich)** — `osr-emergent-fieldplay-metadata-60` → **SPE-58** (part 2/2)
_Automated retrofit from `planning/osr-emergent-fieldplay-metadata-60-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable design-article pass (emergent sandbox / rules-lite fieldplay principles). Pattern-only — no imported RPG names, article prose, fantasy encounter examples, or proprietary OSR terminology.
- **Dedup:** Supplements `tabletop-mechanics-transcript-metadata-87` (OSR agency, partial success), `field-staff-operations-handbook-metadata-105` (weather/season), `pulp-expedition-adventure-metadata-40` (travel legs), `sealed-facility-manual-metadata-95` (site routes), `campaign-readiness-mission-hub-metadata-96` (retreat partial success).
- **Repo at triage:** `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Candidates on SPE-58:** C49, C50, C54
---

#### C49 — Retained map scars after retreat

**1. Candidate & source**
- **ID:** C49
- **Batch:** `osr-emergent-fieldplay-metadata-60`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Retained map scars after retreat
- **Pattern context:** Abstracted from batch source (Readable design-article pass (emergent sandbox / rules-lite fieldplay principles). Pattern-only — no imported RPG names, article prose, fantasy encounter examples, or proprietary OSR terminology.).
- **Repo anchor:** `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Table note:** Retained map scars after retreat

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-1760

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87` (OSR agency, partial success), `field-staff-operations-handbook-metadata-105` (weather/season), `pulp-expedition-adventure-metadata-40` (travel …

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-emergent-fieldplay-metadata-60-harvest.md` (C49)

---

#### C50 — Re-entry with persistent site state

**1. Candidate & source**
- **ID:** C50
- **Batch:** `osr-emergent-fieldplay-metadata-60`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Re-entry with persistent site state
- **Pattern context:** Abstracted from batch source (Readable design-article pass (emergent sandbox / rules-lite fieldplay principles). Pattern-only — no imported RPG names, article prose, fantasy encounter examples, or proprietary OSR terminology.).
- **Repo anchor:** `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Table note:** Re-entry with persistent site state

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-1760

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87` (OSR agency, partial success), `field-staff-operations-handbook-metadata-105` (weather/season), `pulp-expedition-adventure-metadata-40` (travel …

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/osr-emergent-fieldplay-metadata-60-harvest.md` (C50)

---

#### C54 — Real agency consequences

**1. Candidate & source**
- **ID:** C54
- **Batch:** `osr-emergent-fieldplay-metadata-60`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Real agency consequences
- **Pattern context:** Abstracted from batch source (Readable design-article pass (emergent sandbox / rules-lite fieldplay principles). Pattern-only — no imported RPG names, article prose, fantasy encounter examples, or proprietary OSR terminology.).
- **Repo anchor:** `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `mapMetadata.ts`; `districtSchedule.ts` (rare events); `shared/outcomes.ts`; `equipment.ts`; `authorityGraph` rumor confidence; `recruitment` rumorTags; `siteGeneration` multi-entry patterns.
- **Table note:** Real agency consequences

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-58

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `tabletop-mechanics-transcript-metadata-87` (OSR agency, partial success), `field-staff-operations-handbook-metadata-105` (weather/season), `pulp-expedition-adventure-metadata-40` (travel …

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/osr-emergent-fieldplay-metadata-60-harvest.md` (C54)
