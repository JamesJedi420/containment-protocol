**Harvest retrofit (rich)** — `haunted-estate-dual-pressure-metadata-106` → **SPE-901** (part 2/2)
_Automated retrofit from `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.
- **Dedup:** Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-faction-metadata-35`, `field-staff-operations-handbook-metadata-105`.
- **Repo at triage:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Candidates on SPE-901:** C95, C101
---

#### C95 — Countermeasure custody conflict

**1. Candidate & source**
- **ID:** C95
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Countermeasure custody conflict
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Countermeasure custody conflict

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-901
- **Co-owners:** SPE-35

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-901 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C95)

---

#### C101 — Chain-of-custody for recovery

**1. Candidate & source**
- **ID:** C101
- **Batch:** `haunted-estate-dual-pressure-metadata-106`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Chain-of-custody for recovery
- **Pattern context:** Abstracted from batch source (Readable keyed manor scenario PDF (31 pp.; dual external/internal pressure). Pattern-only — no imported adventure title, room prose, NPC names, stat blocks, map art, or table text.).
- **Repo anchor:** `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `progressClocks.ts`; `siteGeneration/mapMetadata.ts`; `branchContinuity.ts`; `regionPackets.ts` (`externalPressure`); `constructionProgress.ts`; `folkloreTruthProfiles` (map fallibility).
- **Table note:** Chain-of-custody for recovery

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-901
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-901

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `sealed-facility-manual-metadata-95`, `horror-tension-questionnaire-metadata-50`, `osr-emergent-fieldplay-metadata-60`, `tabletop-mechanics-transcript-metadata-87`, `spatial-remodeling-fac…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/haunted-estate-dual-pressure-metadata-106-harvest.md` (C101)
