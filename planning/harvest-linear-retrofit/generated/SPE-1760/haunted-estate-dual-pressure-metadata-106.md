**Harvest retrofit (rich)** — `haunted-estate-dual-pressure-metadata-106` → **SPE-1760** (part 1/1)
_Automated retrofit from `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.
- **Dedup:** Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-faction-metadata-35`, `field-staff-operations-handbook-metadata-105`.
- **Repo at triage:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Candidates on SPE-1760:** C21, C78, C79, C80
---

#### C21 — Observation-dependent room reset

**1. Candidate & source**
- **ID:** C21
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Observation-dependent room reset
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Observation-dependent room reset

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-58

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C21)

---

#### C78 — Encounter validity vs continuity

**1. Candidate & source**
- **ID:** C78
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Encounter validity vs continuity
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Encounter validity vs continuity

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-371

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C78)

---

#### C79 — Default actor locations unless continuity overrides

**1. Candidate & source**
- **ID:** C79
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Default actor locations unless continuity overrides
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Default actor locations unless continuity overrides

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C79)

---

#### C80 — Mobile actor locations after contact

**1. Candidate & source**
- **ID:** C80
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Mobile actor locations after contact
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Mobile actor locations after contact

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1760
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1760 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C80)
