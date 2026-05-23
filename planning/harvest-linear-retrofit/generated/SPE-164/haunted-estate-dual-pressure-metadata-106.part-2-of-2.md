**Harvest retrofit (rich)** — `haunted-estate-dual-pressure-metadata-106` → **SPE-164** (part 2/2)
_Automated retrofit from `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.
- **Dedup:** Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-faction-metadata-35`, `field-staff-operations-handbook-metadata-105`.
- **Repo at triage:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Candidates on SPE-164:** C68, C69, C71
---

#### C68 — Traversal fall-risk modifiers

**1. Candidate & source**
- **ID:** C68
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Traversal fall-risk modifiers
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Traversal fall-risk modifiers

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-164
- **Co-owners:** SPE-130

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-164 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C68)

---

#### C69 — Site equipment repurposing

**1. Candidate & source**
- **ID:** C69
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Site equipment repurposing
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Site equipment repurposing

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-164
- **Co-owners:** SPE-1034

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-164 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C69)

---

#### C71 — Room key schema + state overlays

**1. Candidate & source**
- **ID:** C71
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Room key schema + state overlays
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Room key schema + state overlays

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-164
- **Co-owners:** SPE-58

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-164 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C71)
