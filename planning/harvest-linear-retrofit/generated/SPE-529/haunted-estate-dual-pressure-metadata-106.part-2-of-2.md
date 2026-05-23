**Harvest retrofit (rich)** — `haunted-estate-dual-pressure-metadata-106` → **SPE-529** (part 2/2)
_Automated retrofit from `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.
- **Dedup:** Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-faction-metadata-35`, `field-staff-operations-handbook-metadata-105`.
- **Repo at triage:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Candidates on SPE-529:** C62, C63, C64, C87, C94, C99
---

#### C62 — Temporary anomalous condition registry

**1. Candidate & source**
- **ID:** C62
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Temporary anomalous condition registry
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Temporary anomalous condition registry

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-1107

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C62)

---

#### C63 — Sample testing safety abstraction

**1. Candidate & source**
- **ID:** C63
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Sample testing safety abstraction
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Sample testing safety abstraction

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-529

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C63)

---

#### C64 — Social-perception altering artifacts

**1. Candidate & source**
- **ID:** C64
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Social-perception altering artifacts
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Social-perception altering artifacts

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-208

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C64)

---

#### C87 — Role-changing gear procedures

**1. Candidate & source**
- **ID:** C87
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Role-changing gear procedures
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Role-changing gear procedures

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-98

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C87)

---

#### C94 — Class-denial zone objects

**1. Candidate & source**
- **ID:** C94
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Class-denial zone objects
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Class-denial zone objects

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-58

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-529 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C94)

---

#### C99 — No real ingestion guidance

**1. Candidate & source**
- **ID:** C99
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** No real ingestion guidance
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** No real ingestion guidance

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-529
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-529

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C99)
